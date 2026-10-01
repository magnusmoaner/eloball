using api;
using api.Auth;
using api.Database;
using api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Resend;

var builder = WebApplication.CreateBuilder(args);

var frontendBaseUrl = builder.Configuration["Frontend:BaseUrl"]
    ?? throw new InvalidOperationException("Frontend:BaseUrl is not configured.");
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? [frontendBaseUrl];

// The session cookie is cross-origin (SPA and API are different subdomains), so the browser only
// sends it when the origin is named explicitly — AllowAnyOrigin and AllowCredentials are mutually
// exclusive.
const string corsPolicy = "_spa";
builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicy, policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<ProfileResolver>();
builder.Services.AddDbContext<EloballContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Email via Resend. Key comes from user-secrets locally and App Service settings (Resend__ApiKey) in prod.
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.Section));
var resendApiKey = builder.Configuration["Resend:ApiKey"];
if (string.IsNullOrWhiteSpace(resendApiKey))
{
    if (!builder.Environment.IsDevelopment())
        throw new InvalidOperationException("Resend:ApiKey is not configured.");
    builder.Services.AddSingleton<IEmailSender, NoOpEmailSender>();
}
else
{
    builder.Services.AddOptions();
    builder.Services.Configure<ResendClientOptions>(o => o.ApiToken = resendApiKey);
    builder.Services.AddHttpClient<IResend, ResendClient>();
    builder.Services.AddScoped<IEmailSender, ResendEmailSender>();
}

// Sign-up requires a confirmed address. Config is the emergency lever if mail delivery breaks.
var requireConfirmedEmail = builder.Configuration.GetValue("Auth:RequireConfirmedEmail", true);

builder.Services.AddIdentityApiEndpoints<AppUser>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;

        // An address maps to exactly one account — this is what makes re-linking an old Auth0
        // profile by email safe.
        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedEmail = requireConfirmedEmail;
    })
    .AddEntityFrameworkStores<EloballContext>();

// Registered after AddIdentityApiEndpoints so it wins over Identity's built-in no-op sender.
// Note the generic IEmailSender<AppUser>: the non-generic one is a different interface and
// registering that instead is the usual reason no mail goes out, silently.
builder.Services.AddTransient<IEmailSender<AppUser>, IdentityEmailSender>();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.Cookie.HttpOnly = true;
    options.ExpireTimeSpan = TimeSpan.FromDays(30);
    options.SlidingExpiration = true;

    // This is an API: answer unauthenticated calls with a status code, never a login redirect.
    options.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

// Apply pending SQL migrations on startup (same scripts as scripts/db.sh).
// Disable with "RunMigrationsOnStartup": false (e.g. if migrations are run out-of-band).
if (app.Configuration.GetValue("RunMigrationsOnStartup", true))
{
    api.MigrationRunner.Run(
        builder.Configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is not configured."),
        Path.Combine(AppContext.BaseDirectory, "migrations"),
        app.Logger);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors(corsPolicy);
app.UseAuthentication();
app.UseAuthorization();

// register / confirmEmail / resendConfirmationEmail / forgotPassword / resetPassword / manage.
// Login, logout and who-am-I are ours (see AuthController) — Identity's own /login returns bearer
// tokens unless coaxed with ?useCookies, and its /manage/info knows nothing about players.
app.MapGroup("/api/identity").MapIdentityApi<AppUser>();

// Every controller action needs a signed-in user unless it says [AllowAnonymous] (Health, and
// AuthController.Login). Applied here rather than as a global FallbackPolicy because a fallback
// also swallows Identity's own /register and /forgotPassword, which carry no auth metadata.
app.MapControllers().RequireAuthorization();

app.Run();

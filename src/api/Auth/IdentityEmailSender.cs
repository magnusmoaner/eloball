using api.Database;
using api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;

namespace api.Auth;

/// <summary>
/// Bridges ASP.NET Identity's email hooks onto our Resend sender.
///
/// Identity hands us links pointing at its own API endpoints, which render bare text. We rewrite
/// them to point at the SPA, which can show a real page and then scrub the token out of the URL.
/// </summary>
/// <remarks>
/// Takes an <see cref="IServiceScopeFactory"/> rather than the sender itself: MapIdentityApi
/// resolves this from the root provider at startup, which forbids capturing scoped services like
/// the Resend client.
/// </remarks>
public class IdentityEmailSender(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<IdentityEmailSender> logger) : IEmailSender<AppUser>
{
    private string FrontendBaseUrl => configuration["Frontend:BaseUrl"]?.TrimEnd('/')
        ?? throw new InvalidOperationException("Frontend:BaseUrl is not configured.");

    public Task SendConfirmationLinkAsync(AppUser user, string email_, string confirmationLink)
    {
        // Identity built this against its own /confirmEmail route; we only want the parameters.
        // Fall back to its link rather than failing to send at all if the shape ever changes.
        // Identity HTML-encodes the link (it expects to be dropped straight into markup), so the
        // separators arrive as &amp; — decode before parsing or every param but the first is lost.
        var decoded = System.Net.WebUtility.HtmlDecode(confirmationLink);
        var query = QueryHelpers.ParseQuery(new Uri(decoded).Query);
        string link;
        if (query.TryGetValue("userId", out var userId) && query.TryGetValue("code", out var code))
        {
            link = $"{FrontendBaseUrl}/confirm-email?userId={Uri.EscapeDataString(userId.ToString())}&code={Uri.EscapeDataString(code.ToString())}";
        }
        else
        {
            logger.LogWarning("Unexpected confirmation link shape, sending Identity's own: {Link}", decoded);
            link = decoded;
        }

        return Send(email_, "Confirm your Eloball account",
            "Welcome to Eloball!",
            "Confirm your email address to finish setting up your account.",
            "Confirm email", link);
    }

    public Task SendPasswordResetCodeAsync(AppUser user, string email_, string resetCode)
    {
        // This is the method MapIdentityApi actually calls — it passes a code, not a link, so the
        // link is ours to build. The code is Base64Url text and must be escaped.
        var link = $"{FrontendBaseUrl}/reset-password?email={Uri.EscapeDataString(email_)}&code={Uri.EscapeDataString(resetCode)}";

        return Send(email_, "Reset your Eloball password",
            "Reset your password",
            "Someone asked to reset your Eloball password. If that wasn't you, ignore this email.",
            "Choose a new password", link);
    }

    public Task SendPasswordResetLinkAsync(AppUser user, string email_, string resetLink) =>
        Send(email_, "Reset your Eloball password",
            "Reset your password",
            "Someone asked to reset your Eloball password. If that wasn't you, ignore this email.",
            "Choose a new password", resetLink);

    private async Task Send(string to, string subject, string heading, string body, string cta, string link)
    {
        var html = $"""
            <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c1917">
              <h1 style="font-size:20px;font-weight:800;margin:0 0 12px">{heading}</h1>
              <p style="font-size:15px;line-height:1.5;margin:0 0 24px;color:#57534e">{body}</p>
              <a href="{link}" style="display:inline-block;background:#f97316;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:12px">{cta}</a>
              <p style="font-size:13px;line-height:1.5;margin:24px 0 0;color:#a8a29e">
                Or paste this into your browser:<br><span style="word-break:break-all">{link}</span>
              </p>
            </div>
            """;

        // Local development has no mailbox to check; this is how you get at the link. Debug level,
        // so it stays off unless appsettings.Development.json turns it on.
        logger.LogDebug("Email {Subject} to {To} links to {Link}", subject, to, link);

        try
        {
            using var scope = scopeFactory.CreateScope();
            var email = scope.ServiceProvider.GetRequiredService<IEmailSender>();
            await email.SendAsync(to, subject, html);
        }
        catch (Exception ex)
        {
            // Deliberately not rethrown: by the time we get here Identity has already created the
            // account, so a 500 would leave the user with an account they can neither use nor
            // re-register. Better to let the SPA show "check your inbox" with a resend button —
            // but make the failure loud in the logs, since nothing else will surface it.
            logger.LogError(ex, "Failed to send {Subject} to {To}", subject, to);
        }
    }
}

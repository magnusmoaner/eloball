using Microsoft.Extensions.Options;
using Resend;

namespace api.Services;

public class EmailOptions
{
    public const string Section = "Resend";
    public string ApiKey { get; set; } = "";
    /// <summary>Sender shown to recipients, e.g. "Eloball &lt;noreply@billigeterninger.dk&gt;". Must be on a domain verified in Resend.</summary>
    public string From { get; set; } = "";
}

public interface IEmailSender
{
    Task SendAsync(string to, string subject, string html, CancellationToken ct = default);
}

/// <summary>Sends transactional email through Resend.</summary>
public class ResendEmailSender(IResend resend, IOptions<EmailOptions> options, ILogger<ResendEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(string to, string subject, string html, CancellationToken ct = default)
    {
        var message = new EmailMessage
        {
            From = options.Value.From,
            Subject = subject,
            HtmlBody = html,
        };
        message.To.Add(to);

        var result = await resend.EmailSendAsync(message, ct);
        logger.LogInformation("Sent email {Subject} to {To} (id {Id})", subject, to, result.Content);
    }
}

/// <summary>Used when no Resend API key is configured (local dev). Logs instead of sending.</summary>
public class NoOpEmailSender(ILogger<NoOpEmailSender> logger) : IEmailSender
{
    public Task SendAsync(string to, string subject, string html, CancellationToken ct = default)
    {
        logger.LogWarning("Resend:ApiKey not configured — email {Subject} to {To} was NOT sent", subject, to);
        return Task.CompletedTask;
    }
}

namespace api.Database;

public partial class UserProfile
{
    public int Id { get; set; }

    /// <summary>
    /// Legacy Auth0 subject claim. Null for accounts created after the Identity switch; kept on
    /// older rows only so they can be matched up if something goes wrong. Nothing reads it.
    /// </summary>
    public string? Auth0Sub { get; set; }

    /// <summary>The ASP.NET Identity account, or null for a profile not yet re-linked.</summary>
    public string? IdentityUserId { get; set; }

    public string? Email { get; set; }

    /// <summary>The claimed player, or null until the user claims/creates one.</summary>
    public int? PlayerId { get; set; }

    public DateTime CreatedDateTime { get; set; }

    public DateTime UpdatedDateTime { get; set; }

    public virtual Player? Player { get; set; }
}

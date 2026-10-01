namespace api.Database;

public partial class League
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    /// <summary>Shared as a link/QR code; rotating it invalidates every copy in circulation.</summary>
    public string? InviteCode { get; set; }

    /// <summary>
    /// Opt-in: a public league is listed to every signed-in user and joinable without a code.
    /// Off by default — invite-only is what keeps strangers out of a private league's ELO.
    /// </summary>
    public bool IsPublic { get; set; }

    public DateTime CreatedDateTime { get; set; }

    public DateTime UpdatedDateTime { get; set; }

    public virtual ICollection<LeagueMembership> Memberships { get; set; } = new List<LeagueMembership>();

    public virtual ICollection<Season> Seasons { get; set; } = new List<Season>();
}

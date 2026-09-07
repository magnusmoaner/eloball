namespace api.Database;

public partial class League
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    /// <summary>Shared as a link/QR code; rotating it invalidates every copy in circulation.</summary>
    public string? InviteCode { get; set; }

    public DateTime CreatedDateTime { get; set; }

    public DateTime UpdatedDateTime { get; set; }

    public virtual ICollection<LeagueMembership> Memberships { get; set; } = new List<LeagueMembership>();

    public virtual ICollection<Season> Seasons { get; set; } = new List<Season>();
}

using System.Security.Claims;
using api.Database;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace api.Auth;

/// <summary>
/// Resolves the signed-in Identity account to its <see cref="UserProfile"/> — the single seam
/// between credentials and the domain. Replaces the old <c>CurrentSub</c> lookups that matched on
/// <c>auth0Sub</c>.
/// </summary>
public class ProfileResolver(EloballContext context, UserManager<AppUser> userManager)
{
    /// <summary>The current account's profile, or null if it hasn't been created yet (→ onboarding).</summary>
    public async Task<UserProfile?> CurrentProfileAsync(ClaimsPrincipal principal)
    {
        var userId = userManager.GetUserId(principal);
        if (string.IsNullOrEmpty(userId))
            return null;

        var profile = await context.UserProfiles
            .Include(u => u.Player)
            .FirstOrDefaultAsync(u => u.IdentityUserId == userId);
        if (profile != null)
            return profile;

        // Nothing linked yet. If an unlinked profile exists for this address it belongs to an
        // Auth0-era user who has just re-registered — adopt it so their player and match history
        // come back with them. This runs once, lazily, on their first authenticated request.
        var user = await userManager.FindByIdAsync(userId);
        if (string.IsNullOrWhiteSpace(user?.Email))
            return null;

        profile = await context.UserProfiles
            .Include(u => u.Player)
            .FirstOrDefaultAsync(u => u.IdentityUserId == null && u.Email == user.Email);
        if (profile == null)
            return null;

        profile.IdentityUserId = userId;
        profile.UpdatedDateTime = DateTime.Now;
        await context.SaveChangesAsync();
        return profile;
    }

    /// <summary>The signed-in Identity account's id and email, for creating a profile.</summary>
    public async Task<(string Id, string? Email)> CurrentAccountAsync(ClaimsPrincipal principal)
    {
        var user = await userManager.GetUserAsync(principal)
            ?? throw new InvalidOperationException("No signed-in account.");
        return (user.Id, user.Email);
    }

    /// <summary>The current account's claimed player id, or null before onboarding.</summary>
    public async Task<int?> CurrentPlayerIdAsync(ClaimsPrincipal principal) =>
        (await CurrentProfileAsync(principal))?.PlayerId;

    /// <summary>
    /// Whether the current account plays in this league. Leagues are invite-only, so this is the
    /// check that keeps a signed-up stranger out of one — reading its seasons as much as writing
    /// matches into them.
    /// </summary>
    public async Task<bool> IsMemberAsync(ClaimsPrincipal principal, int leagueId)
    {
        var playerId = await CurrentPlayerIdAsync(principal);
        return playerId != null
            && await context.LeagueMemberships.AnyAsync(m => m.LeagueId == leagueId && m.PlayerId == playerId);
    }

    /// <summary>Same check, for endpoints addressed by season rather than by league.</summary>
    public async Task<bool> IsMemberOfSeasonAsync(ClaimsPrincipal principal, int seasonId)
    {
        var leagueId = await context.Seasons
            .Where(s => s.Id == seasonId)
            .Select(s => (int?)s.LeagueId)
            .FirstOrDefaultAsync();
        return leagueId != null && await IsMemberAsync(principal, leagueId.Value);
    }
}

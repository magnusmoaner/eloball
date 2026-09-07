using api.Auth;
using api.Database;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

public record CreateLeagueDto(string Name, string? SeasonName);
public record RenameLeagueDto(string Name);
public record DelegateLeagueDto(int PlayerId);
public record JoinLeagueDto(string Code);

[ApiController]
[Route("api/[controller]")]
public class LeagueController(EloballContext context, ProfileResolver profiles) : ControllerBase
{
    private const string Owner = "Owner";
    private const string Member = "Member";

    private Task<int?> CurrentPlayerId() => profiles.CurrentPlayerIdAsync(User);

    /// <summary>Short, unambiguous invite code — no 0/O/1/I, so it survives being read off a QR-less printout.</summary>
    private static string NewInviteCode()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var chars = new char[8];
        var bytes = System.Security.Cryptography.RandomNumberGenerator.GetBytes(8);
        for (var i = 0; i < chars.Length; i++)
            chars[i] = alphabet[bytes[i] % alphabet.Length];
        return new string(chars);
    }

    private async Task<string> EnsureInviteCode(League league)
    {
        if (!string.IsNullOrEmpty(league.InviteCode))
            return league.InviteCode;

        league.InviteCode = NewInviteCode();
        league.UpdatedDateTime = DateTime.Now;
        await context.SaveChangesAsync();
        return league.InviteCode;
    }

    private Task<LeagueMembership?> Membership(int leagueId, int playerId) =>
        context.LeagueMemberships.FirstOrDefaultAsync(m => m.LeagueId == leagueId && m.PlayerId == playerId);

    /// <summary>
    /// What an invite code points at, so someone can see which league they're about to join.
    /// Deliberately the only way to look a league up you don't belong to — there is no browse.
    /// </summary>
    [HttpGet("preview", Name = "PreviewLeague")]
    public async Task<ActionResult<object>> Preview([FromQuery] string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return BadRequest("Code is required.");

        var league = await context.Leagues
            .Where(l => l.InviteCode == code)
            .Select(l => new { l.Id, l.Name, MemberCount = l.Memberships.Count })
            .FirstOrDefaultAsync();

        return league == null ? NotFound("Unknown invite code.") : Ok(league);
    }

    /// <summary>Leagues the current player belongs to (+ their role).</summary>
    [HttpGet("mine", Name = "GetMyLeagues")]
    public async Task<IEnumerable<object>> Mine()
    {
        var playerId = await CurrentPlayerId();
        if (playerId == null) return Array.Empty<object>();

        return await context.LeagueMemberships
            .Where(m => m.PlayerId == playerId)
            .OrderBy(m => m.League.Name)
            .Select(m => new
            {
                Id = m.LeagueId,
                m.League.Name,
                m.Role,
                MemberCount = m.League.Memberships.Count,
                HasOwner = m.League.Memberships.Any(x => x.Role == Owner),
            })
            .ToListAsync();
    }

    /// <summary>Members of a league (player id + name + role) — for owner management UI.</summary>
    [HttpGet("{id}/members", Name = "GetLeagueMembers")]
    public async Task<IEnumerable<object>> Members(int id)
    {
        return await context.LeagueMemberships
            .Where(m => m.LeagueId == id)
            .OrderByDescending(m => m.Role == Owner)
            .ThenBy(m => m.Player.Name)
            .Select(m => new { m.PlayerId, m.Player.Name, m.Role })
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CreateLeagueDto dto)
    {
        var playerId = await CurrentPlayerId();
        if (playerId == null) return BadRequest("Claim a player first.");

        var name = dto.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name)) return BadRequest("Name is required.");

        var league = new League { Name = name };
        context.Leagues.Add(league);
        await context.SaveChangesAsync();

        context.LeagueMemberships.Add(new LeagueMembership
        {
            LeagueId = league.Id,
            PlayerId = playerId.Value,
            Role = Owner,
        });

        // Open the first season in the same call. A league without one can't record a match, so
        // leaving it to a second request just risks a dead-end league if that request never comes.
        var seasonName = dto.SeasonName?.Trim();
        if (!string.IsNullOrWhiteSpace(seasonName))
        {
            context.Seasons.Add(new Season
            {
                Name = seasonName,
                StartDate = DateTime.Now,
                IsActive = true,
                CreatedAt = DateTime.Now,
                LeagueId = league.Id,
            });
        }

        await EnsureInviteCode(league);

        return Ok(new { league.Id, league.Name, league.InviteCode });
    }

    [HttpPut("{id}", Name = "RenameLeague")]
    public async Task<ActionResult> Rename(int id, [FromBody] RenameLeagueDto dto)
    {
        var playerId = await CurrentPlayerId();
        if (playerId == null) return BadRequest("Claim a player first.");

        var league = await context.Leagues.FindAsync(id);
        if (league == null) return NotFound();

        var membership = await Membership(id, playerId.Value);
        if (membership?.Role != Owner) return BadRequest("Only the league owner can rename it.");

        var name = dto.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name)) return BadRequest("Name is required.");

        league.Name = name;
        league.UpdatedDateTime = DateTime.Now;
        await context.SaveChangesAsync();
        return Ok(new { league.Id, league.Name });
    }

    /// <summary>Join by invite code. Holding the code *is* the authorisation — there is no open join.</summary>
    [HttpPost("join", Name = "JoinLeague")]
    public async Task<ActionResult> Join([FromBody] JoinLeagueDto dto)
    {
        var playerId = await CurrentPlayerId();
        if (playerId == null) return BadRequest("Claim a player first.");

        var code = dto.Code?.Trim();
        if (string.IsNullOrWhiteSpace(code)) return BadRequest("Code is required.");

        var league = await context.Leagues.FirstOrDefaultAsync(l => l.InviteCode == code);
        if (league == null) return NotFound("Unknown invite code.");

        if (await Membership(league.Id, playerId.Value) != null)
            return Ok(new { league.Id, league.Name }); // idempotent

        context.LeagueMemberships.Add(new LeagueMembership
        {
            LeagueId = league.Id,
            PlayerId = playerId.Value,
            Role = Member,
        });
        await context.SaveChangesAsync();
        return Ok(new { league.Id, league.Name });
    }

    /// <summary>The league's current invite code, minting one on first ask. Owner only.</summary>
    [HttpGet("{id}/invite", Name = "GetLeagueInvite")]
    public async Task<ActionResult<object>> GetInvite(int id)
    {
        var playerId = await CurrentPlayerId();
        if (playerId == null) return BadRequest("Claim a player first.");

        var league = await context.Leagues.FindAsync(id);
        if (league == null) return NotFound();

        var membership = await Membership(id, playerId.Value);
        if (membership?.Role != Owner) return BadRequest("Only the league owner can see the invite code.");

        return Ok(new { code = await EnsureInviteCode(league) });
    }

    /// <summary>Replace the invite code, invalidating every link and printout in circulation.</summary>
    [HttpPost("{id}/invite/rotate", Name = "RotateLeagueInvite")]
    public async Task<ActionResult<object>> RotateInvite(int id)
    {
        var playerId = await CurrentPlayerId();
        if (playerId == null) return BadRequest("Claim a player first.");

        var league = await context.Leagues.FindAsync(id);
        if (league == null) return NotFound();

        var membership = await Membership(id, playerId.Value);
        if (membership?.Role != Owner) return BadRequest("Only the league owner can rotate the invite code.");

        league.InviteCode = NewInviteCode();
        league.UpdatedDateTime = DateTime.Now;
        await context.SaveChangesAsync();
        return Ok(new { code = league.InviteCode });
    }

    [HttpPost("{id}/leave")]
    public async Task<ActionResult> Leave(int id)
    {
        var playerId = await CurrentPlayerId();
        if (playerId == null) return BadRequest("Claim a player first.");

        var membership = await Membership(id, playerId.Value);
        if (membership == null) return NotFound();

        if (membership.Role == Owner)
            return BadRequest("Owners can't leave. Delegate ownership, or remove all members and delete the league.");

        context.LeagueMemberships.Remove(membership);
        await context.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("{id}/claim-ownership")]
    public async Task<ActionResult> ClaimOwnership(int id)
    {
        var playerId = await CurrentPlayerId();
        if (playerId == null) return BadRequest("Claim a player first.");

        var membership = await Membership(id, playerId.Value);
        if (membership == null) return BadRequest("Join the league first.");

        if (await context.LeagueMemberships.AnyAsync(m => m.LeagueId == id && m.Role == Owner))
            return BadRequest("This league already has an owner.");

        membership.Role = Owner;
        await context.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("{id}/delegate")]
    public async Task<ActionResult> Delegate(int id, [FromBody] DelegateLeagueDto dto)
    {
        var playerId = await CurrentPlayerId();
        if (playerId == null) return BadRequest("Claim a player first.");

        var mine = await Membership(id, playerId.Value);
        if (mine?.Role != Owner) return BadRequest("Only the league owner can delegate ownership.");

        var target = await Membership(id, dto.PlayerId);
        if (target == null) return BadRequest("That player is not a member of this league.");
        if (target.PlayerId == playerId) return Ok();

        target.Role = Owner;
        mine.Role = Member;
        await context.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("{id}/members/{memberPlayerId}/remove")]
    public async Task<ActionResult> RemoveMember(int id, int memberPlayerId)
    {
        var playerId = await CurrentPlayerId();
        if (playerId == null) return BadRequest("Claim a player first.");

        var mine = await Membership(id, playerId.Value);
        if (mine?.Role != Owner) return BadRequest("Only the league owner can remove members.");
        if (memberPlayerId == playerId) return BadRequest("Owners can't remove themselves; delegate or delete instead.");

        var target = await Membership(id, memberPlayerId);
        if (target == null) return NotFound();

        context.LeagueMemberships.Remove(target);
        await context.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var playerId = await CurrentPlayerId();
        if (playerId == null) return BadRequest("Claim a player first.");

        var mine = await Membership(id, playerId.Value);
        if (mine?.Role != Owner) return BadRequest("Only the league owner can delete it.");

        if (await context.LeagueMemberships.AnyAsync(m => m.LeagueId == id && m.PlayerId != playerId))
            return BadRequest("Remove all other members before deleting the league.");

        // Sole member → wipe the league and all its data.
        var seasonIds = await context.Seasons.Where(s => s.LeagueId == id).Select(s => s.Id).ToListAsync();
        var matchIds = await context.Matches.Where(m => m.SeasonId != null && seasonIds.Contains(m.SeasonId.Value))
            .Select(m => m.Id).ToListAsync();

        context.PlayerMatches.RemoveRange(context.PlayerMatches.Where(pm => matchIds.Contains(pm.MatchId)));
        context.Matches.RemoveRange(context.Matches.Where(m => matchIds.Contains(m.Id)));
        context.PlayerSeasons.RemoveRange(context.PlayerSeasons.Where(ps => seasonIds.Contains(ps.SeasonId)));
        context.Seasons.RemoveRange(context.Seasons.Where(s => s.LeagueId == id));
        context.LeagueMemberships.RemoveRange(context.LeagueMemberships.Where(m => m.LeagueId == id));
        await context.SaveChangesAsync();

        context.Leagues.Remove((await context.Leagues.FindAsync(id))!);
        await context.SaveChangesAsync();
        return Ok();
    }
}

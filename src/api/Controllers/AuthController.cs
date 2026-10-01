using api.Auth;
using api.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

public record LoginDto(string Email, string Password, bool RememberMe);
public record DeleteAccountDto(string Password);

/// <summary>
/// Login, logout and who-am-I. Everything else (register, confirm, forgot/reset password, change
/// password) is Identity's own, mapped under /api/identity.
///
/// These three are ours because Identity's /login returns bearer tokens unless coaxed with a query
/// string, and because SignInResult tells us *why* a login failed — which its endpoint throws away.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(
    SignInManager<AppUser> signInManager,
    UserManager<AppUser> userManager,
    ProfileResolver profiles,
    EloballContext context) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await signInManager.PasswordSignInAsync(
            dto.Email, dto.Password, isPersistent: dto.RememberMe, lockoutOnFailure: true);

        if (result.Succeeded)
            return Ok();

        if (result.IsLockedOut)
            return StatusCode(StatusCodes.Status423Locked, new { error = "locked_out" });

        // Set by RequireConfirmedEmail — worth telling the user, since otherwise a correct
        // password looks like a wrong one and they have no way to guess what's wrong.
        if (result.IsNotAllowed)
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "email_not_confirmed" });

        return Unauthorized(new { error = "invalid_credentials" });
    }

    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
        await signInManager.SignOutAsync();
        return Ok();
    }

    /// <summary>Account + claimed player in one call, so the SPA boots with a single request.</summary>
    [HttpGet("me")]
    public async Task<ActionResult> Me()
    {
        var user = await userManager.GetUserAsync(User);
        if (user == null)
            return Unauthorized();

        var profile = await profiles.CurrentProfileAsync(User);

        return Ok(new
        {
            email = user.Email,
            emailConfirmed = user.EmailConfirmed,
            playerId = profile?.PlayerId,
            playerName = profile?.Player?.Name,
        });
    }

    /// <summary>
    /// Deletes the login and the profile, and takes the player off every roster. The player row
    /// and its matches stay: everyone else's rating was earned against them, so removing that
    /// history would rewrite other people's numbers. Off every roster, the player can't be picked
    /// for a match or claimed by anyone — nothing adds someone else's player to a league.
    /// </summary>
    [HttpPost("delete-account")]
    public async Task<ActionResult> DeleteAccount([FromBody] DeleteAccountDto dto)
    {
        var user = await userManager.GetUserAsync(User);
        if (user == null)
            return Unauthorized();

        // A borrowed phone or an unlocked laptop shouldn't be enough to delete someone.
        if (!await userManager.CheckPasswordAsync(user, dto.Password))
            return BadRequest(new { error = "wrong_password" });

        // Identity's stores share this context, so the user delete joins the same transaction.
        await using var tx = await context.Database.BeginTransactionAsync();

        var profile = await profiles.CurrentProfileAsync(User);
        if (profile?.PlayerId is int playerId)
        {
            var memberships = await context.LeagueMemberships
                .Where(m => m.PlayerId == playerId)
                .ToListAsync();

            // An owner leaving shouldn't strand the league: the longest-standing member takes
            // over. A league with nobody left stays as it is, history and all.
            foreach (var owned in memberships.Where(m => m.Role == "Owner"))
            {
                var successor = await context.LeagueMemberships
                    .Where(m => m.LeagueId == owned.LeagueId && m.PlayerId != playerId)
                    .OrderBy(m => m.JoinedDateTime)
                    .FirstOrDefaultAsync();
                if (successor != null)
                    successor.Role = "Owner";
            }

            context.LeagueMemberships.RemoveRange(memberships);
        }

        // Before the user: FK_userProfile_identityUser doesn't cascade.
        if (profile != null)
            context.UserProfiles.Remove(profile);
        await context.SaveChangesAsync();

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return StatusCode(StatusCodes.Status500InternalServerError);

        await tx.CommitAsync();
        await signInManager.SignOutAsync();
        return Ok();
    }
}

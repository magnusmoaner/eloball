using api.Auth;
using api.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

public record LoginDto(string Email, string Password, bool RememberMe);

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
    ProfileResolver profiles) : ControllerBase
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
}

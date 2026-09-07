using Microsoft.AspNetCore.Identity;

namespace api.Database;

/// <summary>
/// The credential side of an account: email, password hash, lockout state.
/// Deliberately empty — everything domain-ish (the claimed player, league membership) hangs off
/// <see cref="UserProfile"/>, which links here via <see cref="UserProfile.IdentityUserId"/>.
/// </summary>
public class AppUser : IdentityUser
{
}

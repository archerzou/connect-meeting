using Microsoft.EntityFrameworkCore;

namespace CalConnect.Api.Users.Infrastructure;

internal static class UserDbSetExtensions
{
    public static async Task<bool> Exists(this DbSet<User> users, string email)
    {
        return await users.AnyAsync(u => u.Email == email);
    }

    public static async Task<User?> GetByEmail(this DbSet<User> users, string email)
    {
        return await users.SingleOrDefaultAsync(u => u.Email == email);
    }
}

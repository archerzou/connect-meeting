using CalConnect.Api.Meetings;
using CalConnect.Api.Roles.Domain;
using CalConnect.Api.Users;
using Microsoft.EntityFrameworkCore;

namespace CalConnect.Api.Database;

internal class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    
    public DbSet<Role> Roles { get; set; }
    
    public DbSet<UserRole> UserRoles { get; set; }

    public DbSet<EmailVerificationToken> EmailVerificationTokens { get; set; }

    public DbSet<RefreshToken> RefreshTokens { get; set; }

    public DbSet<Meeting> Meetings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        base.OnModelCreating(modelBuilder);
    }
}

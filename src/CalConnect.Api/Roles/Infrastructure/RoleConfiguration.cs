using CalConnect.Api.Roles.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CalConnect.Api.Roles.Infrastructure;

internal sealed class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Name).HasMaxLength(50).IsRequired();

        builder.HasData(
            new Role { Id = Role.AdminId, Name = Role.Admin },
            new Role { Id = Role.MemberId, Name = Role.Member });
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CalConnect.Api.Meetings.Infrastructure;

internal sealed class MeetingConfiguration : IEntityTypeConfiguration<Meeting>
{
    public void Configure(EntityTypeBuilder<Meeting> builder)
    {
        builder.OwnsMany(m => m.Participants, p => p.ToJson());

        builder.OwnsMany(m => m.AgendaItems, p => p.ToJson());
    }
}

using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

namespace CalConnect.Api.Meetings;

internal sealed class GetMeeting(AppDbContext context)
{
    public async Task<MeetingResponse?> Handle(Guid id)
    {
        Meeting? meeting = await context.Meetings
            .AsNoTracking()
            .SingleOrDefaultAsync(m => m.Id == id);

        return meeting is null ? null : MeetingMapper.ToResponse(meeting);
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("meetings/{id:guid}", async (Guid id, GetMeeting useCase) =>
            {
                MeetingResponse? meeting = await useCase.Handle(id);

                return meeting is not null ? Results.Ok(meeting) : Results.NotFound();
            })
            .WithTags(MeetingEndpoints.Tag)
            .RequireAuthorization();
        }
    }
}

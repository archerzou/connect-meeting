using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;

namespace CalConnect.Api.Meetings;

internal sealed class UpdateMeeting(AppDbContext context)
{
    public sealed record Request(
        Guid Id,
        string Title,
        string Description,
        DateTime StartTime,
        TimeSpan Duration,
        string Location,
        List<AgendaItemRequest> AgendaItems);

    public sealed record AgendaItemRequest(string Title, TimeSpan Duration);

    public async Task<bool> Handle(Request request)
    {
        Meeting? meeting = await context.Meetings.FindAsync(request.Id);

        if (meeting is null)
        {
            return false;
        }

        meeting.Title = request.Title;
        meeting.Description = request.Description;
        meeting.StartTime = request.StartTime.ToUtcSafe();
        meeting.Duration = request.Duration;
        meeting.EndTime = meeting.StartTime.Add(meeting.Duration);
        meeting.Location = request.Location;

        await context.SaveChangesAsync();

        return true;
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPut("meetings/{id:guid}", async (Guid id, Request request, UpdateMeeting useCase) =>
            {
                if (id != request.Id)
                {
                    return Results.BadRequest("Id in the route must match the Id in the request body");
                }

                bool success = await useCase.Handle(request);
                return success ? Results.NoContent() : Results.NotFound();
            })
            .WithTags(MeetingEndpoints.Tag)
            .RequireAuthorization();
        }
    }
}

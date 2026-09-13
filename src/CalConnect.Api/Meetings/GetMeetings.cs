using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

namespace CalConnect.Api.Meetings;

internal sealed class GetMeetings(AppDbContext context)
{
    public async Task<IReadOnlyCollection<MeetingResponse>> Handle(string? search)
    {
        IQueryable<Meeting> query = context.Meetings.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            string pattern = $"%{search.Trim()}%";
            query = query.Where(m =>
                EF.Functions.ILike(m.Title, pattern) ||
                EF.Functions.ILike(m.Description, pattern) ||
                EF.Functions.ILike(m.Location, pattern));
        }

        List<Meeting> meetings = await query
            .OrderBy(m => m.StartTime)
            .ToListAsync();

        return meetings.Select(MeetingMapper.ToResponse).ToList();
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("meetings", async (string? search, GetMeetings useCase) =>
                Results.Ok(await useCase.Handle(search)))
                .WithTags(MeetingEndpoints.Tag)
                .RequireAuthorization();
        }
    }
}

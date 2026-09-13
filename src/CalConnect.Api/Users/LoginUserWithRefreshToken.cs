using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using CalConnect.Api.Users.Infrastructure;
using Microsoft.EntityFrameworkCore;
using ApplicationException = CalConnect.Api.Exceptions.ApplicationException;

namespace CalConnect.Api.Users;

internal sealed class LoginUserWithRefreshToken(AppDbContext context, TokenProvider tokenProvider)
{
    public sealed record Request(string RefreshToken);
    public sealed record Response(string AccessToken, string RefreshToken);

    public async Task<Response> Handle(Request request)
    {
        RefreshToken? refreshToken = await context.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == request.RefreshToken);

        if (refreshToken is null || refreshToken.ExpiresOnUtc < DateTime.UtcNow)
        {
            throw new ApplicationException("The refresh token has expired");
        }

        string accessToken = tokenProvider.Create(refreshToken.User);

        refreshToken.Token = tokenProvider.GenerateRefreshToken();
        refreshToken.ExpiresOnUtc = DateTime.UtcNow.AddDays(7);

        await context.SaveChangesAsync();

        return new Response(accessToken, refreshToken.Token);
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("users/refresh-token", async (Request request, LoginUserWithRefreshToken useCase) =>
                    await useCase.Handle(request))
                .WithTags(UserEndpoints.Tag);
        }
    }
}

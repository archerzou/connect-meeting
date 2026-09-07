using CalConnect.Api.Database;
using CalConnect.Api.Exceptions;
using CalConnect.Api.Meetings;
using CalConnect.Api.Users;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using ApplicationException = CalConnect.Api.Exceptions.ApplicationException;

namespace CalConnect.UnitTests.Meetings;

public class CreateMeetingTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ICalendarSyncService _calendarSyncService;
    private readonly MeetingPolicyService _meetingPolicyService;
    private readonly CreateMeeting _createMeeting;

    public CreateMeetingTests()
    {
        DbContextOptions<AppDbContext> options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _emailService = Substitute.For<IEmailService>();
        _calendarSyncService = Substitute.For<ICalendarSyncService>();
        _meetingPolicyService = new MeetingPolicyService();
        _createMeeting = new CreateMeeting(_context, _emailService, _calendarSyncService, _meetingPolicyService);
    }

    [Fact]
    public async Task Handle_ValidRequest_CreatesMeeting()
    {
        // Arrange
        var organizer = new User
        {
            Id = Guid.NewGuid(),
            Email = "organizer@example.com",
            FirstName = "John",
            LastName = "Doe",
            PasswordHash = "hashedpassword"
        };
        _context.Users.Add(organizer);
        await _context.SaveChangesAsync();

        var request = new CreateMeeting.Request(
            Title: "Test Meeting",
            Description: "Test Description",
            StartTime: DateTime.UtcNow.AddDays(1),
            Duration: TimeSpan.FromHours(1),
            Location: "Test Location",
            Type: MeetingType.Standard,
            Participants: [],
            AgendaItems: [],
            OrganizerId: organizer.Id
        );

        // Act
        Guid result = await _createMeeting.Handle(request);

        // Assert
        result.Should().NotBeEmpty();
        Meeting? createdMeeting = await _context.Meetings.FindAsync(result);
        createdMeeting.Should().NotBeNull();
        createdMeeting!.Title.Should().Be(request.Title);
        createdMeeting.Description.Should().Be(request.Description);
        createdMeeting.StartTime.Should().Be(request.StartTime);
        createdMeeting.Duration.Should().Be(request.Duration);
        createdMeeting.Location.Should().Be(request.Location);
        createdMeeting.Type.Should().Be(request.Type);
    }

    [Fact]
    public async Task Handle_OrganizerNotFound_ThrowsException()
    {
        // Arrange
        var request = new CreateMeeting.Request(
            Title: "Test Meeting",
            Description: "Test Description",
            StartTime: DateTime.UtcNow.AddDays(1),
            Duration: TimeSpan.FromHours(1),
            Location: "Test Location",
            Type: MeetingType.Standard,
            Participants: [],
            AgendaItems: [],
            OrganizerId: Guid.NewGuid()
        );

        // Act
        Func<Task> act = async () => await _createMeeting.Handle(request);

        // Assert
        await act.Should().ThrowAsync<ApplicationException>().WithMessage("Organizer not found.");
    }

    [Fact]
    public async Task Handle_InvalidDuration_ThrowsException()
    {
        // Arrange
        User organizer = CreateValidUser();
        _context.Users.Add(organizer);
        await _context.SaveChangesAsync();

        var request = new CreateMeeting.Request(
            Title: "Test Meeting",
            Description: "Test Description",
            StartTime: DateTime.UtcNow.AddDays(1),
            Duration: TimeSpan.FromHours(3), // Exceeds max duration for standard meeting
            Location: "Test Location",
            Type: MeetingType.Standard,
            Participants: [],
            AgendaItems: [],
            OrganizerId: organizer.Id
        );

        // Act
        Func<Task> act = async () => await _createMeeting.Handle(request);

        // Assert
        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("Invalid meeting duration for Standard meeting type.");
    }

    [Fact]
    public async Task Handle_OrganizerTimeConflict_ThrowsException()
    {
        // Arrange
        User organizer = CreateValidUser();
        _context.Users.Add(organizer);
        var existingMeeting = new Meeting
        {
            Id = Guid.NewGuid(),
            Title = "Existing Meeting",
            Description = "This is an existing meeting",
            Location = "Conference Room A",
            StartTime = DateTime.UtcNow.AddDays(1),
            EndTime = DateTime.UtcNow.AddDays(1).AddHours(1),
            Type = MeetingType.Standard
        };
        existingMeeting.AddParticipant(organizer.Id, ParticipantRole.Organizer);
        _context.Meetings.Add(existingMeeting);
        await _context.SaveChangesAsync();

        var request = new CreateMeeting.Request(
            Title: "Test Meeting",
            Description: "Test Description",
            StartTime: DateTime.UtcNow.AddDays(1),
            Duration: TimeSpan.FromHours(1),
            Location: "Test Location",
            Type: MeetingType.Standard,
            Participants: [],
            AgendaItems: [],
            OrganizerId: organizer.Id
        );

        // Act
        Func<Task> act = async () => await _createMeeting.Handle(request);

        // Assert
        await act.Should().ThrowAsync<ApplicationException>()
            .WithMessage("The organizer has a time conflict with another meeting.");
    }

    [Fact]
    public async Task Handle_ParticipantNotFound_ThrowsException()
    {
        // Arrange
        User organizer = CreateValidUser();
        _context.Users.Add(organizer);
        await _context.SaveChangesAsync();

        var request = new CreateMeeting.Request(
            Title: "Test Meeting",
            Description: "Test Description",
            StartTime: DateTime.UtcNow.AddDays(1),
            Duration: TimeSpan.FromHours(1),
            Location: "Test Location",
            Type: MeetingType.Standard,
            Participants: [new CreateMeeting.ParticipantRequest(Guid.NewGuid(), ParticipantRole.Required)],
            AgendaItems: [],
            OrganizerId: organizer.Id
        );

        // Act
        Func<Task> act = async () => await _createMeeting.Handle(request);

        // Assert
        await act.Should().ThrowAsync<ApplicationException>()
            .WithMessage($"Participant with ID {request.Participants[0].UserId} not found.");
    }

    [Fact]
    public async Task Handle_ParticipantTimeConflict_ThrowsException()
    {
        // Arrange
        User organizer = CreateValidUser();
        User participant = CreateValidUser();
        _context.Users.AddRange(organizer, participant);
        var existingMeeting = new Meeting
        {
            Id = Guid.NewGuid(),
            Title = "Existing Meeting",
            Description = "This is an existing meeting",
            Location = "Conference Room A",
            StartTime = DateTime.UtcNow.AddDays(1),
            EndTime = DateTime.UtcNow.AddDays(1).AddHours(1),
            Type = MeetingType.Standard
        };
        existingMeeting.AddParticipant(participant.Id, ParticipantRole.Required);
        _context.Meetings.Add(existingMeeting);
        await _context.SaveChangesAsync();

        var request = new CreateMeeting.Request(
            Title: "Test Meeting",
            Description: "Test Description",
            StartTime: DateTime.UtcNow.AddDays(1),
            Duration: TimeSpan.FromHours(1),
            Location: "Test Location",
            Type: MeetingType.Standard,
            Participants: [new CreateMeeting.ParticipantRequest(participant.Id, ParticipantRole.Required)],
            AgendaItems: [],
            OrganizerId: organizer.Id
        );

        // Act
        Func<Task> act = async () => await _createMeeting.Handle(request);

        // Assert
        await act.Should().ThrowAsync<ApplicationException>()
            .WithMessage($"Participant {participant.Id} has a time conflict.");
    }

    [Fact]
    public async Task Handle_InvalidParticipantRole_ThrowsException()
    {
        // Arrange
        User organizer = CreateValidUser();
        User participant = CreateValidUser();
        _context.Users.AddRange(organizer, participant);
        await _context.SaveChangesAsync();

        var request = new CreateMeeting.Request(
            Title: "Test Meeting",
            Description: "Test Description",
            StartTime: DateTime.UtcNow.AddDays(1),
            Duration: TimeSpan.FromHours(1),
            Location: "Test Location",
            Type: MeetingType.Workshop,
            Participants: [new CreateMeeting.ParticipantRequest(participant.Id, ParticipantRole.DecisionMaker)],
            AgendaItems: [],
            OrganizerId: organizer.Id
        );

        // Act
        Func<Task> act = async () => await _createMeeting.Handle(request);

        // Assert
        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("Cannot add participant with role DecisionMaker to this meeting type.");
    }

    [Fact]
    public async Task Handle_AgendaExceedsMeetingDuration_ThrowsException()
    {
        // Arrange
        User organizer = CreateValidUser();
        _context.Users.Add(organizer);
        await _context.SaveChangesAsync();

        var request = new CreateMeeting.Request(
            Title: "Test Meeting",
            Description: "Test Description",
            StartTime: DateTime.UtcNow.AddDays(1),
            Duration: TimeSpan.FromHours(1),
            Location: "Test Location",
            Type: MeetingType.Standard,
            Participants: [],
            AgendaItems:
            [
                new CreateMeeting.AgendaItemRequest("Item 1", TimeSpan.FromMinutes(40)),
                new CreateMeeting.AgendaItemRequest("Item 2", TimeSpan.FromMinutes(40))
            ],
            OrganizerId: organizer.Id
        );

        // Act
        Func<Task> act = async () => await _createMeeting.Handle(request);

        // Assert
        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("Total agenda duration exceeds meeting duration.");
    }

    [Fact]
    public async Task Handle_ValidRequest_SendsInvitationsAndSyncsCalendars()
    {
        // Arrange
        User organizer = CreateValidUser();
        User participant = CreateValidUser();
        _context.Users.AddRange(organizer, participant);
        await _context.SaveChangesAsync();

        var request = new CreateMeeting.Request(
            Title: "Test Meeting",
            Description: "Test Description",
            StartTime: DateTime.UtcNow.AddDays(1),
            Duration: TimeSpan.FromHours(1),
            Location: "Test Location",
            Type: MeetingType.Standard,
            Participants: [new CreateMeeting.ParticipantRequest(participant.Id, ParticipantRole.Required)],
            AgendaItems: [],
            OrganizerId: organizer.Id
        );

        // Act
        Guid result = await _createMeeting.Handle(request);

        // Assert
        result.Should().NotBeEmpty();
        await _emailService.Received(1).SendMeetingInvitation(participant.Id, Arg.Any<Meeting>());
        await _calendarSyncService.Received(1).SyncMeetingToExternalCalendars(Arg.Any<Meeting>());
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private static User CreateValidUser() => new()
    {
        Id = Guid.NewGuid(),
        Email = $"user{Guid.NewGuid()}@example.com",
        FirstName = "Test",
        LastName = "User",
        PasswordHash = "hashedpassword"
    };
}

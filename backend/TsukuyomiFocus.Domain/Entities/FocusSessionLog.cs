namespace TsukuyomiFocus.Domain.Entities;

public class FocusSessionLog
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? MissionId { get; set; }
    public string? MissionTitle { get; set; }
    public string? Rank { get; set; }
    public int DurationMinutes { get; set; }
    public int ChakraEarned { get; set; }
    public bool WasSusanooActive { get; set; }
    public bool WasCompleted { get; set; }
    public DateOnly SessionDate { get; set; }
    public DateTime CreatedAt { get; set; }

    public static FocusSessionLog CreateCompleted(
        Guid userId,
        Mission? mission,
        int durationMinutes,
        int chakraEarned,
        bool wasSusanooActive,
        DateOnly sessionDate,
        DateTime createdAt) => new()
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            MissionId = mission?.Id,
            MissionTitle = mission?.Title,
            Rank = mission?.Rank,
            DurationMinutes = durationMinutes,
            ChakraEarned = chakraEarned,
            WasSusanooActive = wasSusanooActive,
            WasCompleted = true,
            SessionDate = sessionDate,
            CreatedAt = createdAt
        };

    public static FocusSessionLog CreateAbandoned(
        Guid userId,
        Mission? mission,
        int durationMinutesElapsed,
        bool wasSusanooActive,
        DateOnly sessionDate,
        DateTime createdAt) => new()
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            MissionId = mission?.Id,
            MissionTitle = mission?.Title,
            Rank = mission?.Rank,
            DurationMinutes = durationMinutesElapsed,
            ChakraEarned = 0,
            WasSusanooActive = wasSusanooActive,
            WasCompleted = false,
            SessionDate = sessionDate,
            CreatedAt = createdAt
        };
}

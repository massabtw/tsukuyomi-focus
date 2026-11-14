namespace TsukuyomiFocus.Application.DTOs;

public class FocusSessionLogDto
{
    public Guid Id { get; set; }
    public Guid? MissionId { get; set; }
    public string? MissionTitle { get; set; }
    public string? Rank { get; set; }
    public int DurationMinutes { get; set; }
    public int ChakraEarned { get; set; }
    public bool WasSusanooActive { get; set; }
    public bool WasCompleted { get; set; }
    public string Date { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class CompleteSessionRequest
{
    public Guid? MissionId { get; set; }
    public int DurationMinutes { get; set; }
    public bool WasSusanooActive { get; set; }
    public bool MarkMissionCompleted { get; set; }
}

public class CompleteSessionResponseDto
{
    public FocusSessionLogDto Session { get; set; } = new();
    public ProfileDto Profile { get; set; } = new();
    public IzanagiStateDto Izanagi { get; set; } = new();
    public MissionDto? UpdatedMission { get; set; }
    public int ChakraEarned { get; set; }
    public bool UnlockedNewEyeStage { get; set; }
    public string? NewEyeStage { get; set; }
    public bool EyeRestored { get; set; }
}

public class AbandonSessionRequest
{
    public Guid? MissionId { get; set; }
    public int DurationMinutesElapsed { get; set; }
    public bool WasSusanooActive { get; set; }
    public bool UseIzanagiToPreventPenalty { get; set; }
}

public class AbandonSessionResponseDto
{
    public FocusSessionLogDto Session { get; set; } = new();
    public ProfileDto Profile { get; set; } = new();
    public IzanagiStateDto Izanagi { get; set; } = new();
    public bool IzanagiInvoked { get; set; }
    public int ChakraPenaltyApplied { get; set; }
}

public class InvokeIzanagiRequest
{
    public string? Reason { get; set; }
}

public class IzanagiInvocationResponseDto
{
    public ProfileDto Profile { get; set; } = new();
    public IzanagiStateDto Izanagi { get; set; } = new();
    public string BlindedEye { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

namespace TsukuyomiFocus.Application.DTOs;

public class MissionDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Rank { get; set; } = "D";
    public string Status { get; set; } = "todo";
    public int EstimatedMinutes { get; set; }
    public int CompletedMinutes { get; set; }
    public int CompletedCycles { get; set; }
    public bool IsAmaterasu { get; set; }
    public string? AmaterasuDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class CreateMissionRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Rank { get; set; } = "D";
    public int? EstimatedMinutes { get; set; }
    public bool IsAmaterasu { get; set; }
}

public class UpdateMissionRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Rank { get; set; } = "D";
    public int? EstimatedMinutes { get; set; }
}

public class UpdateMissionStatusRequest
{
    public string Status { get; set; } = "todo";
}

public class ToggleAmaterasuRequest
{
    public bool? IsAmaterasu { get; set; }
}

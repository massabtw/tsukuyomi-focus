namespace TsukuyomiFocus.Application.DTOs;

public class ScrollStatsResponseDto
{
    public ScrollKpisDto Kpis { get; set; } = new();
    public IReadOnlyList<HeatmapDayDto> Heatmap { get; set; } = [];
    public IReadOnlyList<RankDistributionItemDto> RankDistribution { get; set; } = [];
    public IReadOnlyList<FocusSessionLogDto> RecentLogs { get; set; } = [];
}

public class ScrollKpisDto
{
    public double TotalFocusHours { get; set; }
    public int TotalFocusMinutes { get; set; }
    public int TotalChakra { get; set; }
    public string CurrentEyeStage { get; set; } = "normal";
    public int CurrentStreak { get; set; }
    public int BestStreak { get; set; }
    public double CompletionAccuracyPercentage { get; set; }
    public int TotalIzanagiUsed { get; set; }
    public int AmaterasuMissionsCompleted { get; set; }
}

public class HeatmapDayDto
{
    public string Date { get; set; } = string.Empty;
    public int Minutes { get; set; }
    public int Chakra { get; set; }
    public int Sessions { get; set; }
    public int IntensityLevel { get; set; }
}

public class RankDistributionItemDto
{
    public string Rank { get; set; } = string.Empty;
    public int CompletedMissions { get; set; }
}

public class HealthResponseDto
{
    public string Status { get; set; } = string.Empty;
    public string Database { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class ApiErrorResponse
{
    public string Error { get; set; } = string.Empty;
    public string? Code { get; set; }
}

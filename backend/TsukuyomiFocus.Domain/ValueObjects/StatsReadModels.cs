namespace TsukuyomiFocus.Domain.ValueObjects;

public sealed class ScrollAggregateCounts
{
    public int TotalSessions { get; set; }
    public int CompletedSessions { get; set; }
    public int AmaterasuMissionsCompleted { get; set; }
}

public sealed class HeatmapDayAggregate
{
    public DateOnly SessionDate { get; set; }
    public int Minutes { get; set; }
    public int Chakra { get; set; }
    public int Sessions { get; set; }
}

public sealed class RankDistributionAggregate
{
    public string Rank { get; set; } = string.Empty;
    public int CompletedMissions { get; set; }
}

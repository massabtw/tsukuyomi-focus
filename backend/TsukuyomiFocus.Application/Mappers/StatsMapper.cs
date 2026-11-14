using System.Globalization;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Domain.Entities;
using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Application.Mappers;

public static class StatsMapper
{
    private const string IsoDateFormat = "yyyy-MM-dd";

    public static ScrollStatsResponseDto ToScrollStatsDto(
        this UserProfile profile,
        ScrollAggregateCounts counts,
        IReadOnlyList<HeatmapDayAggregate> heatmap,
        IReadOnlyList<RankDistributionAggregate> rankDistribution,
        IReadOnlyList<FocusSessionLog> recentLogs)
    {
        ArgumentNullException.ThrowIfNull(profile);
        ArgumentNullException.ThrowIfNull(counts);
        ArgumentNullException.ThrowIfNull(heatmap);
        ArgumentNullException.ThrowIfNull(rankDistribution);
        ArgumentNullException.ThrowIfNull(recentLogs);

        return new ScrollStatsResponseDto
        {
            Kpis = profile.ToScrollKpisDto(counts),
            Heatmap = heatmap.Select(day => day.ToHeatmapDayDto()).ToList(),
            RankDistribution = rankDistribution.Select(rank => rank.ToRankDistributionDto()).ToList(),
            RecentLogs = recentLogs.Select(log => log.ToRecentLogDto()).ToList()
        };
    }

    public static ScrollKpisDto ToScrollKpisDto(this UserProfile profile, ScrollAggregateCounts counts)
    {
        ArgumentNullException.ThrowIfNull(profile);
        ArgumentNullException.ThrowIfNull(counts);

        var totalFocusHours = Math.Round(
            profile.TotalFocusMinutes / 60.0,
            2,
            MidpointRounding.AwayFromZero);

        var completionAccuracyPercentage = counts.TotalSessions > 0
            ? Math.Clamp(
                Math.Round(
                    (double)counts.CompletedSessions / counts.TotalSessions * 100.0,
                    2,
                    MidpointRounding.AwayFromZero),
                0.0,
                100.0)
            : 0.0;

        return new ScrollKpisDto
        {
            TotalFocusHours = totalFocusHours,
            TotalFocusMinutes = profile.TotalFocusMinutes,
            TotalChakra = profile.TotalChakra,
            CurrentEyeStage = profile.CurrentEyeStage,
            CurrentStreak = profile.CurrentStreak,
            BestStreak = profile.BestStreak,
            CompletionAccuracyPercentage = completionAccuracyPercentage,
            TotalIzanagiUsed = profile.TotalIzanagiUsed,
            AmaterasuMissionsCompleted = counts.AmaterasuMissionsCompleted
        };
    }

    public static HeatmapDayDto ToHeatmapDayDto(this HeatmapDayAggregate aggregate)
    {
        ArgumentNullException.ThrowIfNull(aggregate);

        return new HeatmapDayDto
        {
            Date = aggregate.SessionDate.ToString(IsoDateFormat, CultureInfo.InvariantCulture),
            Minutes = aggregate.Minutes,
            Chakra = aggregate.Chakra,
            Sessions = aggregate.Sessions,
            IntensityLevel = LoreRules.GetHeatmapIntensityLevel(aggregate.Minutes)
        };
    }

    public static RankDistributionItemDto ToRankDistributionDto(this RankDistributionAggregate aggregate)
    {
        ArgumentNullException.ThrowIfNull(aggregate);

        return new RankDistributionItemDto
        {
            Rank = aggregate.Rank,
            CompletedMissions = aggregate.CompletedMissions
        };
    }

    public static FocusSessionLogDto ToRecentLogDto(this FocusSessionLog entity)
    {
        ArgumentNullException.ThrowIfNull(entity);

        return new FocusSessionLogDto
        {
            Id = entity.Id,
            MissionId = entity.MissionId,
            MissionTitle = entity.MissionTitle,
            Rank = entity.Rank,
            DurationMinutes = entity.DurationMinutes,
            ChakraEarned = entity.ChakraEarned,
            WasSusanooActive = entity.WasSusanooActive,
            WasCompleted = entity.WasCompleted,
            Date = entity.SessionDate.ToString(IsoDateFormat, CultureInfo.InvariantCulture),
            Timestamp = entity.CreatedAt
        };
    }
}

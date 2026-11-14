using TsukuyomiFocus.Domain.Entities;
using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Domain.Interfaces;

public interface IStatsRepository
{
    Task<UserProfile?> GetDefaultProfileAsync(CancellationToken cancellationToken = default);

    Task<ScrollAggregateCounts> GetScrollAggregateCountsAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<HeatmapDayAggregate>> GetHeatmapDataAsync(
        Guid userId,
        DateOnly startDate,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RankDistributionAggregate>> GetRankDistributionAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FocusSessionLog>> GetRecentLogsAsync(
        Guid userId,
        string? rank = null,
        bool? completed = null,
        int limit = 30,
        CancellationToken cancellationToken = default);
}

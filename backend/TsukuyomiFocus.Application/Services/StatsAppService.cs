using TsukuyomiFocus.Application.Common;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Application.Interfaces;
using TsukuyomiFocus.Application.Mappers;
using TsukuyomiFocus.Domain.Entities;
using TsukuyomiFocus.Domain.Interfaces;
using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Application.Services;

public sealed class StatsAppService : IStatsAppService
{
    private const int HeatmapDays = 365;
    private const int RecentLogsLimit = 30;
    private const string ProfileNotFoundMessage = "Perfil Uchiha padrão não encontrado.";
    private const string ProfileNotFoundCode = "PROFILE_NOT_FOUND";

    private readonly IStatsRepository _statsRepository;

    public StatsAppService(IStatsRepository statsRepository)
    {
        ArgumentNullException.ThrowIfNull(statsRepository);
        _statsRepository = statsRepository;
    }

    public async Task<ServiceResult<ScrollStatsResponseDto>> GetScrollStatsAsync(
        string? rank = null,
        bool? completed = null,
        CancellationToken cancellationToken = default)
    {
        string? normalizedRank = null;
        if (!string.IsNullOrWhiteSpace(rank))
        {
            normalizedRank = rank.Trim().ToUpperInvariant();
            if (!LoreRules.Ranks.IsValid(normalizedRank))
            {
                return ServiceResult<ScrollStatsResponseDto>.BadRequest(
                    $"Rank '{rank}' inválido. Valores permitidos: D, C, B, A, S.",
                    "INVALID_RANK");
            }
        }

        var profile = await _statsRepository.GetDefaultProfileAsync(cancellationToken);
        if (profile is null)
        {
            return ServiceResult<ScrollStatsResponseDto>.NotFound(
                ProfileNotFoundMessage,
                ProfileNotFoundCode);
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var startDate = today.AddDays(-(HeatmapDays - 1));

        var counts = await _statsRepository.GetScrollAggregateCountsAsync(profile.Id, cancellationToken)
                     ?? new ScrollAggregateCounts();
        var heatmapRows = await _statsRepository.GetHeatmapDataAsync(profile.Id, startDate, cancellationToken)
                          ?? Array.Empty<HeatmapDayAggregate>();
        var rankRows = await _statsRepository.GetRankDistributionAsync(profile.Id, cancellationToken)
                       ?? Array.Empty<RankDistributionAggregate>();
        var recentLogs = await _statsRepository.GetRecentLogsAsync(
                             profile.Id,
                             normalizedRank,
                             completed,
                             RecentLogsLimit,
                             cancellationToken)
                         ?? Array.Empty<FocusSessionLog>();

        var zeroFilledHeatmap = BuildZeroFilledHeatmap(startDate, heatmapRows);
        var zeroFilledRankDistribution = BuildZeroFilledRankDistribution(rankRows);

        return ServiceResult<ScrollStatsResponseDto>.Ok(
            profile.ToScrollStatsDto(counts, zeroFilledHeatmap, zeroFilledRankDistribution, recentLogs));
    }

    private static IReadOnlyList<HeatmapDayAggregate> BuildZeroFilledHeatmap(
        DateOnly startDate,
        IReadOnlyList<HeatmapDayAggregate> heatmapRows)
    {
        var heatmapByDate = new Dictionary<DateOnly, HeatmapDayAggregate>();
        foreach (var row in heatmapRows)
        {
            if (heatmapByDate.TryGetValue(row.SessionDate, out var existing))
            {
                existing.Minutes += row.Minutes;
                existing.Chakra += row.Chakra;
                existing.Sessions += row.Sessions;
            }
            else
            {
                heatmapByDate[row.SessionDate] = new HeatmapDayAggregate
                {
                    SessionDate = row.SessionDate,
                    Minutes = row.Minutes,
                    Chakra = row.Chakra,
                    Sessions = row.Sessions
                };
            }
        }

        var heatmap = new List<HeatmapDayAggregate>(HeatmapDays);
        for (var i = 0; i < HeatmapDays; i++)
        {
            var date = startDate.AddDays(i);
            var aggregate = heatmapByDate.TryGetValue(date, out var existing)
                ? existing
                : new HeatmapDayAggregate { SessionDate = date };

            heatmap.Add(aggregate);
        }

        return heatmap;
    }

    private static IReadOnlyList<RankDistributionAggregate> BuildZeroFilledRankDistribution(
        IReadOnlyList<RankDistributionAggregate> rankRows)
    {
        var rankCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rankRows)
        {
            if (string.IsNullOrWhiteSpace(row.Rank))
            {
                continue;
            }

            var normalizedKey = row.Rank.Trim().ToUpperInvariant();
            rankCounts[normalizedKey] = rankCounts.GetValueOrDefault(normalizedKey, 0) + row.CompletedMissions;
        }

        return LoreRules.Ranks.OrderedAscending
            .Select(rankCode => new RankDistributionAggregate
            {
                Rank = rankCode,
                CompletedMissions = rankCounts.GetValueOrDefault(rankCode, 0)
            })
            .ToList();
    }
}

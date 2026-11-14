using System.Globalization;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Domain.Entities;

namespace TsukuyomiFocus.Application.Mappers;

public static class MissionMapper
{
    private const string IsoDateFormat = "yyyy-MM-dd";

    public static MissionDto ToMissionDto(this Mission mission)
    {
        ArgumentNullException.ThrowIfNull(mission);

        return new MissionDto
        {
            Id = mission.Id,
            Title = mission.Title,
            Description = mission.Description,
            Rank = mission.Rank,
            Status = mission.Status,
            EstimatedMinutes = mission.EstimatedMinutes,
            CompletedMinutes = mission.CompletedMinutes,
            CompletedCycles = mission.CompletedCycles,
            IsAmaterasu = mission.IsAmaterasu,
            AmaterasuDate = mission.AmaterasuDate?.ToString(IsoDateFormat, CultureInfo.InvariantCulture),
            CreatedAt = mission.CreatedAt,
            CompletedAt = mission.CompletedAt
        };
    }

    public static IReadOnlyList<MissionDto> ToMissionDtoList(this IEnumerable<Mission> missions)
    {
        ArgumentNullException.ThrowIfNull(missions);

        return missions
            .Select(mission => mission.ToMissionDto())
            .ToList();
    }
}

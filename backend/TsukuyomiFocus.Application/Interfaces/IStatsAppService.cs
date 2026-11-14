using TsukuyomiFocus.Application.Common;
using TsukuyomiFocus.Application.DTOs;

namespace TsukuyomiFocus.Application.Interfaces;

public interface IStatsAppService
{
    Task<ServiceResult<ScrollStatsResponseDto>> GetScrollStatsAsync(
        string? rank = null,
        bool? completed = null,
        CancellationToken cancellationToken = default);
}

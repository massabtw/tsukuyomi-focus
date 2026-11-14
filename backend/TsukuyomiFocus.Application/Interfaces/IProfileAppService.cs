using TsukuyomiFocus.Application.Common;
using TsukuyomiFocus.Application.DTOs;

namespace TsukuyomiFocus.Application.Interfaces;

public interface IProfileAppService
{
    Task<ServiceResult<AppStateResponseDto>> GetFullStateAsync(CancellationToken cancellationToken = default);

    Task<ServiceResult<DailyCheckResponseDto>> RunDailyCheckAsync(CancellationToken cancellationToken = default);

    Task<ServiceResult<ProfileDto>> UpdateEyeCustomizationAsync(
        EyeCustomizationRequest request,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<AppStateResponseDto>> DevSimulateAsync(
        DevSimulateRequest request,
        CancellationToken cancellationToken = default);
}

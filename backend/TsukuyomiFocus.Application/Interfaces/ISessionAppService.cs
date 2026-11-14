using TsukuyomiFocus.Application.Common;
using TsukuyomiFocus.Application.DTOs;

namespace TsukuyomiFocus.Application.Interfaces;

public interface ISessionAppService
{
    Task<ServiceResult<CompleteSessionResponseDto>> CompleteSessionAsync(
        CompleteSessionRequest request,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<AbandonSessionResponseDto>> AbandonSessionAsync(
        AbandonSessionRequest request,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<IzanagiInvocationResponseDto>> InvokeIzanagiAsync(
        InvokeIzanagiRequest? request = null,
        CancellationToken cancellationToken = default);
}

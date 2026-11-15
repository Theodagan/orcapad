import type { ReactNode } from 'react'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'

import { canConfirmDecision, type DecisionConfirmation } from './decision-confirmation'

export function DecisionConfirm({
  confirmation,
  currentRequestId,
  onCancel,
  onConfirm
}: {
  confirmation: DecisionConfirmation | null
  currentRequestId: string | null
  onCancel: () => void
  onConfirm: () => void
}): ReactNode {
  const t = useMobileTranslation()
  const request = confirmation?.request
  const operation = request?.detail ?? request?.title ?? ''
  const effect = request?.decisionReason ?? request?.description ?? confirmation?.option.label ?? ''
  const message = request
    ? `${t('deck.decision.request', 'Request')}: ${request.title}\n${t('deck.decision.operation', 'Operation')}: ${operation}\n${t('deck.decision.effect', 'Effect')}: ${effect}\n${t('deck.decision.requestId', 'Request ID')}: ${confirmation?.requestId ?? ''}`
    : undefined
  return (
    <ConfirmModal
      visible={confirmation !== null}
      title={t('deck.decision.title', 'Confirm decision')}
      message={message}
      confirmLabel={confirmation?.option.label ?? t('common.confirm', 'Confirm')}
      onCancel={onCancel}
      onConfirm={() => {
        if (
          confirmation &&
          currentRequestId &&
          canConfirmDecision(confirmation, currentRequestId, 'confirm')
        ) {
          onConfirm()
        }
      }}
    />
  )
}

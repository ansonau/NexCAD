import { useTranslation } from 'react-i18next';
import { CAR_PRESETS, buildCarNodes } from '../parts/presets';
import { useDocumentStore } from '../store/documentStore';
import { Dialog, OutlineButton } from './ui';

export function CarPresetMenu({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const addNodes = useDocumentStore((s) => s.addNodes);
  const setSelection = useDocumentStore((s) => s.setSelection);

  return (
    <Dialog title={t('toolbar.smartCar')} onClose={onClose} width="w-72">
      <div className="flex flex-col gap-1.5">
        {CAR_PRESETS.map((spec) => (
          <OutlineButton
            key={spec.id}
            className="w-full"
            onClick={() => {
              const { nodes, defaultSelection } = buildCarNodes(spec, i18n.language);
              addNodes(nodes);
              setSelection(defaultSelection);
              onClose();
            }}
          >
            {t(spec.i18nKey)}
          </OutlineButton>
        ))}
      </div>
    </Dialog>
  );
}
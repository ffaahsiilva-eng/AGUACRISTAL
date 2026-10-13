import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, X, Database, RefreshCw } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface QuotaWarningBannerProps {
  onDismiss?: () => void;
}

export const QuotaWarningBanner: React.FC<QuotaWarningBannerProps> = ({ onDismiss }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const projectId = firebaseConfig.projectId || 'gen-lang-client-0939143532';
  const firestoreDbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const upgradeUrl = `https://console.firebase.google.com/project/${projectId}/firestore/databases/${firestoreDbId}/data?openUpgradeDialog=true`;

  const handleClose = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm">
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5 md:mt-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="font-semibold text-amber-900 flex items-center gap-2">
              <span>Cota Diária Gratuita do Firebase Firestore Atingida</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">
                Modo Offline / Cache Local Ativo
              </span>
            </div>
            <p className="text-amber-800 text-xs sm:text-sm mt-0.5">
              O sistema continua funcionando perfeitamente gravando e consultando dados no seu navegador. O limite de leituras diárias gratuitas do plano Spark reseta à meia-noite (UTC) ou você pode atualizar para o plano Blaze no Firebase Console.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Firebase Console</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-700 transition-colors"
            title="Ocultar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

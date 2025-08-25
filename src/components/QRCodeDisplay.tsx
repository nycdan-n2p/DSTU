import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  sessionId: string;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ sessionId, className = '' }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        const joinUrl = `${window.location.origin}/join/${sessionId}`;
        console.log('🔗 Generating QR code for URL:', joinUrl);
        
        const qrDataUrl = await QRCode.toDataURL(joinUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        setQrCodeUrl(qrDataUrl);
        console.log('✅ QR code generated successfully');
      } catch (error) {
        console.error('❌ Failed to generate QR code:', error);
      }
    };

    generateQR();
  }, [sessionId]);

  if (!qrCodeUrl) {
    return (
      <div className={`bg-white p-4 rounded-lg ${className}`}>
        <div className="w-48 h-48 bg-gray-200 animate-pulse rounded flex items-center justify-center">
          <div className="text-gray-500 text-sm">Generating QR...</div>
        </div>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}/join/${sessionId}`;

  return (
    <div className={`bg-white p-6 rounded-2xl shadow-2xl ${className}`}>
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Join the Game!</h3>
        <p className="text-sm text-gray-600">Scan with your phone camera</p>
      </div>
      <img 
        src={qrCodeUrl} 
        alt="QR Code to join game" 
        className="mx-auto rounded-lg"
      />
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500 break-all mb-2">
          {joinUrl}
        </p>
        <div className="bg-blue-50 rounded-lg p-2">
          <p className="text-xs text-blue-600 font-medium">
            📱 Point your phone camera at this code
          </p>
        </div>
      </div>
    </div>
  );
};
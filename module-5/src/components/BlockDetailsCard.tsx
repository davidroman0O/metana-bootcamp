import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatLargeNumber } from '@/lib/utils/token';
import { BlockData } from '../types';

interface BlockDetailsCardProps {
  blockData: BlockData;
  tokenName: string;
}

export default function BlockDetailsCard({ blockData, tokenName }: BlockDetailsCardProps) {
  const date = new Date(blockData.timestamp * 1000);
  const formattedDate = date.toLocaleString();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Block #{blockData.blockNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Timestamp:</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Base Fee:</span>
            <span>{typeof blockData.baseFee === 'number' ? blockData.baseFee.toFixed(2) : '0.00'} Gwei</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Gas Used:</span>
            <span>{blockData.gasUsed.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Gas Limit:</span>
            <span>{blockData.gasLimit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Gas Used Ratio:</span>
            <span>{typeof blockData.gasUsedRatio === 'number' ? blockData.gasUsedRatio.toFixed(2) : '0.00'}%</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">{tokenName} Transfers:</span>
            <span>
              {formatLargeNumber(typeof blockData.transferVolume === 'number' ? blockData.transferVolume : 0)} {tokenName}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
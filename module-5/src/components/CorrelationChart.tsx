import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { BlockData } from '../types';

interface CorrelationChartProps {
  blockData: BlockData[];
}

export default function CorrelationChart({ blockData }: CorrelationChartProps) {
  // Transform data for the scatter plot
  const scatterData = blockData.map(block => ({
    x: block.gasUsedRatio,
    y: block.baseFee,
    z: 10,
    blockNumber: block.blockNumber
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Correlation: Gas Used Ratio vs Base Fee</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{
                top: 20,
                right: 20,
                bottom: 20,
                left: 20,
              }}
            >
              <CartesianGrid />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Gas Used Ratio" 
                unit="%" 
                domain={['dataMin', 'dataMax']} 
                label={{ value: 'Gas Used Ratio (%)', position: 'bottom' }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Base Fee" 
                unit=" Gwei" 
                domain={['dataMin', 'dataMax']} 
                label={{ value: 'Base Fee (Gwei)', angle: -90, position: 'left' }}
              />
              <ZAxis type="number" dataKey="z" range={[60, 60]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  if (name === 'x') return [`${numValue.toFixed(2)}%`, 'Gas Used Ratio'];
                  if (name === 'y') return [`${numValue.toFixed(2)} Gwei`, 'Base Fee'];
                  return [value, name];
                }}
                labelFormatter={(value) => `Block #${scatterData[value].blockNumber}`}
              />
              <Scatter name="Blocks" data={scatterData} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
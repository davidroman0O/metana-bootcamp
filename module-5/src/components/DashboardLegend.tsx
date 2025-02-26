import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export default function DashboardLegend() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Understanding the Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Token Transfer Volume</h3>
            <p className="text-gray-600">
              Displays the total volume of the selected ERC20 token transfers in each block. Higher peaks indicate larger volumes of the token being moved.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Base Fee</h3>
            <p className="text-gray-600">
              Shows the base fee for each block in Gwei. The base fee adjusts automatically based on network congestion and is burned when transactions are processed.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Gas Used Ratio</h3>
            <p className="text-gray-600">
              Represents the percentage of gas used relative to the gas limit for each block. A higher ratio means the block is more full with transactions.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Correlation Chart</h3>
            <p className="text-gray-600">
              Shows the relationship between Gas Used Ratio and Base Fee. According to EIP-1559, there should be a correlation where higher gas usage leads to higher base fees in subsequent blocks.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
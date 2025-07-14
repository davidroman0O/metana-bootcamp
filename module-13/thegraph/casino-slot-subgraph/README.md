# Casino Slot Subgraph

A comprehensive subgraph for indexing and querying Casino Slot smart contract data, enabling powerful analytics, leaderboards, and real-time tracking for the Boomer's Last Hope casino dApp.

## Overview

This subgraph indexes all events from the CasinoSlot smart contract and provides:
- **Player Analytics**: Detailed statistics for each player including win rates, streaks, and session tracking
- **Leaderboards**: Multiple ranking categories (winnings, volume, win rate, profits, streaks)
- **Casino Analytics**: Profitability tracking, revenue streams, and cost analysis
- **Real-time Data**: Live activity feeds, recent wins, and system health monitoring
- **Historical Data**: Daily, hourly, and all-time statistics

## Key Features

### 1. Player Tracking
- Complete player profiles with performance metrics
- Session-based analytics with duration and outcomes
- Reel preference tracking
- Win/loss streak monitoring
- Chip flow analysis (purchases vs swaps)

### 2. Leaderboard System
- **Categories**: Total winnings, betting volume, win rate, profit, winning streaks
- **Periods**: All-time, monthly, weekly, daily
- **Special Lists**: Whales (high rollers), Lucky players (high win rate)

### 3. Casino Analytics
- **Revenue Tracking**: House fees, VRF markup, swap fees
- **Cost Analysis**: VRF payments, jackpot payouts
- **Profitability Metrics**: Margins, revenue per spin, cost per spin
- **Reel Performance**: Statistics for each reel configuration (3-7 reels)

### 4. System Monitoring
- Contract pause status
- Prize pool tracking
- ETH balance monitoring
- VRF health and capacity
- Active player counts

## Schema Structure

### Core Entities

#### Player
```graphql
type Player @entity {
  id: Bytes! # player address
  totalSpins: BigInt!
  totalBet: BigInt!
  totalWinnings: BigInt!
  winRate: BigDecimal!
  # ... and many more fields
}
```

#### SpinAnalytics
```graphql
type SpinAnalytics @entity {
  id: Bytes! # requestId
  player: Player!
  session: GameSession
  reelCombination: String!
  netResult: BigInt!
  # ... detailed spin data
}
```

#### DailyStat
```graphql
type DailyStat @entity {
  id: Bytes! # date YYYY-MM-DD
  totalSpins: BigInt!
  totalBets: BigInt!
  uniquePlayers: BigInt!
  # ... aggregated daily metrics
}
```

See `schema.graphql` for the complete entity list.

## Installation & Setup

### Prerequisites
- Node.js v16+
- Docker & Docker Compose
- Graph CLI: `npm install -g @graphprotocol/graph-cli`

### Local Development

1. **Start Graph Node**
```bash
make start-node
# or
docker-compose up -d
```

2. **Update Contract Address**
```bash
make update-address ADDRESS=0xYourContractAddress
```

3. **Build & Deploy**
```bash
make dev
# This runs: start-node, create-local, rebuild, deploy-local
```

4. **Quick Redeploy** (after changes)
```bash
make quick-deploy
```

### Manual Steps

```bash
# Update ABI from Hardhat
make update-abi

# Generate TypeScript types
yarn codegen

# Build subgraph
yarn build

# Create on local node
yarn create-local

# Deploy to local node
yarn deploy-local
```

## Query Examples

### Get Top Winners
```graphql
query TopWinners {
  players(
    first: 10
    orderBy: totalWinnings
    orderDirection: desc
  ) {
    id
    totalWinnings
    totalSpins
    winRate
  }
}
```

### Player Profile
```graphql
query PlayerProfile($playerId: Bytes!) {
  player(id: $playerId) {
    totalSpins
    totalWinnings
    currentBalance
    winRate
    favoriteReelCount
    longestWinStreak
  }
}
```

### Casino Profitability
```graphql
query CasinoProfitability {
  casinoProfitability(id: "global") {
    totalRevenue
    totalCosts
    netProfit
    profitMargin
  }
}
```

See `example-queries.graphql` for more comprehensive examples.

## Frontend Integration

### Using with Apollo Client
```javascript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:8000/subgraphs/name/casino-slot-subgraph',
  cache: new InMemoryCache()
});

// Query example
const GET_TOP_WINNERS = gql`
  query GetTopWinners {
    players(first: 10, orderBy: totalWinnings, orderDirection: desc) {
      id
      totalWinnings
    }
  }
`;
```

### Real-time Updates
Use GraphQL subscriptions for live data:
```javascript
subscription RecentSpins {
  spinRequesteds(first: 1, orderBy: blockTimestamp, orderDirection: desc) {
    player
    betAmount
    reelCount
  }
}
```

## License

MIT
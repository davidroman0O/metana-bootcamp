import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { useApolloClient } from '../../graphql/apollo-client';

interface DynamicApolloProviderProps {
  children: React.ReactNode;
}

export function DynamicApolloProvider({ children }: DynamicApolloProviderProps) {
  const client = useApolloClient();
  
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
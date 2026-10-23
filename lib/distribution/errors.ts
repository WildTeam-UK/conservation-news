export class DistributionProviderError extends Error {
  constructor(message: string, readonly outcome: 'retryable' | 'rejected' | 'uncertain') {
    super(message);
    this.name = 'DistributionProviderError';
  }
}


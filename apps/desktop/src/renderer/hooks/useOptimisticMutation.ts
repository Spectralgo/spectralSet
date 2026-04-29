import {
	type QueryClient,
	type QueryKey,
	type UseMutationResult,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";

export interface UseOptimisticMutationOptions<
	TData,
	TError,
	TVariables,
	TSnapshot,
> {
	mutationFn: (variables: TVariables) => Promise<TData>;
	queryKey: QueryKey;
	applyOptimistic: (
		previous: TSnapshot | undefined,
		variables: TVariables,
	) => TSnapshot | undefined;
	onSuccess?: (data: TData, variables: TVariables) => void;
	onError?: (error: TError, variables: TVariables) => void;
}

export interface OptimisticContext<TSnapshot> {
	snapshots: Array<[QueryKey, TSnapshot | undefined]>;
}

export function buildOptimisticMutation<TData, TError, TVariables, TSnapshot>(
	client: QueryClient,
	options: UseOptimisticMutationOptions<TData, TError, TVariables, TSnapshot>,
) {
	const { mutationFn, queryKey, applyOptimistic } = options;
	return {
		mutationFn,
		onMutate: async (
			variables: TVariables,
		): Promise<OptimisticContext<TSnapshot>> => {
			await client.cancelQueries({ queryKey });
			const snapshots = client.getQueriesData<TSnapshot>({ queryKey });
			client.setQueriesData<TSnapshot>({ queryKey }, (current) =>
				applyOptimistic(current as TSnapshot | undefined, variables),
			);
			return { snapshots };
		},
		onError: (
			error: TError,
			variables: TVariables,
			context: OptimisticContext<TSnapshot> | undefined,
		) => {
			if (context) {
				for (const [key, data] of context.snapshots) {
					client.setQueryData(key, data);
				}
			}
			options.onError?.(error, variables);
		},
		onSuccess: (data: TData, variables: TVariables) => {
			options.onSuccess?.(data, variables);
		},
		onSettled: () => {
			client.invalidateQueries({ queryKey });
		},
	};
}

export function useOptimisticMutation<TData, TError, TVariables, TSnapshot>(
	options: UseOptimisticMutationOptions<TData, TError, TVariables, TSnapshot>,
): UseMutationResult<TData, TError, TVariables, OptimisticContext<TSnapshot>> {
	const client = useQueryClient();
	return useMutation<TData, TError, TVariables, OptimisticContext<TSnapshot>>(
		buildOptimisticMutation(client, options),
	);
}

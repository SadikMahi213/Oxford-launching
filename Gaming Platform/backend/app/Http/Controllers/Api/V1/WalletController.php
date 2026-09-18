<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\CreditWalletRequest;
use App\Http\Requests\Api\V1\DebitWalletRequest;
use App\Http\Requests\Api\V1\HoldFundsRequest;
use App\Http\Requests\Api\V1\ReleaseFundsRequest;
use App\Http\Requests\Api\V1\TransferRequest;
use App\Http\Resources\WalletResource;
use App\Http\Resources\WalletTransactionResource;
use App\Http\Responses\ApiResponse;
use App\Models\Wallet;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function __construct(
        private readonly WalletService $wallet
    ) {}

    /**
     * Get the authenticated user's wallets.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $wallets = $user->wallets()->get();

        return ApiResponse::success(
            'Wallets retrieved.',
            WalletResource::collection($wallets),
        );
    }

    /**
     * Get the authenticated user's wallet.
     */
    public function show(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $wallet = $this->wallet->getOrCreateWallet($user);

        return ApiResponse::success(
            'Wallet retrieved.',
            new WalletResource($wallet),
        );
    }

    /**
     * Get wallet balance details.
     */
    public function balance(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $wallet = $this->wallet->getOrCreateWallet($user);

        return ApiResponse::success(
            'Balance retrieved.',
            $this->wallet->getBalance($wallet),
        );
    }

    /**
     * Get wallet transaction history.
     */
    public function transactions(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $wallet = $this->wallet->getOrCreateWallet($user);

        $perPage = min((int) $request->input('per_page', 15), 50);
        $type = $request->input('type');

        $paginator = $this->wallet->getTransactions($wallet, $perPage, $type);

        return ApiResponse::paginated(
            'Transactions retrieved.',
            $paginator,
            WalletTransactionResource::collection($paginator->getCollection()),
        );
    }

    /**
     * Credit funds to the wallet (admin/system operation).
     */
    public function credit(CreditWalletRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $wallet = $this->wallet->getOrCreateWallet($user);

        $transaction = $this->wallet->credit(
            $wallet,
            $request->input('amount'),
            $request->input('reference_type'),
            $request->input('reference_id'),
            $request->input('metadata', []),
        );

        return ApiResponse::success(
            'Funds credited.',
            new WalletResource($wallet->fresh()),
            201,
        );
    }

    /**
     * Debit funds from the wallet.
     */
    public function debit(DebitWalletRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $wallet = $this->wallet->getOrCreateWallet($user);

        $transaction = $this->wallet->debit(
            $wallet,
            $request->input('amount'),
            $request->input('reference_type'),
            $request->input('reference_id'),
            $request->input('metadata', []),
        );

        return ApiResponse::success(
            'Funds debited.',
            new WalletResource($wallet->fresh()),
        );
    }

    /**
     * Hold funds (move from available to locked).
     */
    public function hold(HoldFundsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $wallet = $this->wallet->getOrCreateWallet($user);

        $transaction = $this->wallet->hold(
            $wallet,
            $request->input('amount'),
            $request->input('reference_type'),
            $request->input('reference_id'),
            $request->input('metadata', []),
        );

        return ApiResponse::success(
            'Funds held.',
            new WalletResource($wallet->fresh()),
        );
    }

    /**
     * Release held funds back to available.
     */
    public function release(ReleaseFundsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $wallet = $this->wallet->getOrCreateWallet($user);

        $transaction = $this->wallet->release(
            $wallet,
            $request->input('amount'),
            $request->input('reference_type'),
            $request->input('reference_id'),
            $request->input('metadata', []),
        );

        return ApiResponse::success(
            'Funds released.',
            new WalletResource($wallet->fresh()),
        );
    }

    /**
     * Transfer funds to another user.
     */
    public function transfer(TransferRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $fromWallet = $this->wallet->getOrCreateWallet($user);

        $toUser = \App\Models\User::find($request->input('to_user_id'));

        if (! $toUser) {
            return ApiResponse::error('Recipient not found.', 404);
        }

        $toWallet = $this->wallet->getOrCreateWallet($toUser);

        $result = $this->wallet->transfer(
            $fromWallet,
            $toWallet,
            $request->input('amount'),
            $request->input('reference_type'),
            $request->input('reference_id'),
            $request->input('metadata', []),
        );

        return ApiResponse::success(
            'Transfer completed.',
            [
                'debit' => new WalletTransactionResource($result['debit']),
                'credit' => new WalletTransactionResource($result['credit']),
                'wallet' => new WalletResource($fromWallet->fresh()),
            ],
        );
    }
}

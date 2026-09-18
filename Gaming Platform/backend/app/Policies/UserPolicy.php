<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $currentUser, User $model): bool
    {
        return $currentUser->id === $model->id || $currentUser->hasRole('admin');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $currentUser, User $model): bool
    {
        return $currentUser->id === $model->id || $currentUser->hasRole('admin');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $currentUser, User $model): bool
    {
        return $currentUser->id === $model->id || $currentUser->hasRole('admin');
    }

    /**
     * Determine whether the user can change the account status.
     */
    public function changeStatus(User $currentUser, User $model): bool
    {
        return $currentUser->hasRole('admin') && $currentUser->id !== $model->id;
    }
}

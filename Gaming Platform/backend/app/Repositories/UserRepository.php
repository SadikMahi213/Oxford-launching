<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\Paginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * UserRepository centralizes data-access logic for the User entity.
 * Controllers and services depend on this abstraction rather than the
 * Eloquent model directly, keeping persistence concerns in one place.
 */
class UserRepository
{
    public function create(array $attributes): User
    {
        return User::create($attributes);
    }

    public function findById(int $id): ?User
    {
        return User::find($id);
    }

    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)->first();
    }

    /**
     * @return Paginator<User>
     */
    public function paginate(int $perPage = 15): Paginator
    {
        return User::query()->orderBy('id', 'desc')->paginate($perPage);
    }

    /**
     * @return Collection<int, User>
     */
    public function recent(int $limit = 10): Collection
    {
        return User::query()->orderBy('created_at', 'desc')->limit($limit)->get();
    }
}

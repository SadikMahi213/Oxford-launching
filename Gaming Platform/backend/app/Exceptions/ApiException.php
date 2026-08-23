<?php

namespace App\Exceptions;

use Exception;
use Throwable;

class ApiException extends Exception
{
    protected int $statusCode;

    /** @var array<string, mixed>|null */
    protected ?array $errors;

    /**
     * @param  array<string, mixed>|null  $errors
     */
    public function __construct(
        string $message = 'Error',
        int $statusCode = 400,
        ?array $errors = null,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, $statusCode, $previous);

        $this->statusCode = $statusCode;
        $this->errors = $errors;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getErrors(): ?array
    {
        return $this->errors;
    }

    public static function badRequest(string $message = 'Bad request', ?array $errors = null): self
    {
        return new self($message, 400, $errors);
    }

    public static function unauthorized(string $message = 'Unauthorized', ?array $errors = null): self
    {
        return new self($message, 401, $errors);
    }

    public static function forbidden(string $message = 'Forbidden', ?array $errors = null): self
    {
        return new self($message, 403, $errors);
    }

    public static function notFound(string $message = 'Resource not found', ?array $errors = null): self
    {
        return new self($message, 404, $errors);
    }
}

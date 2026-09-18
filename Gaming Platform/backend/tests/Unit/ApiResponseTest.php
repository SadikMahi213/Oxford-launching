<?php

use App\Http\Responses\ApiResponse;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

uses(TestCase::class);

it('returns a consistent success envelope', function () {
    $response = ApiResponse::success('ok', ['foo' => 'bar']);

    expect($response->getStatusCode())->toBe(Response::HTTP_OK);
    expect($response->getData(true))->toMatchArray([
        'success' => true,
        'message' => 'ok',
        'data' => ['foo' => 'bar'],
        'errors' => null,
        'meta' => null,
    ]);
});

it('returns a consistent error envelope', function () {
    $response = ApiResponse::error('bad', Response::HTTP_BAD_REQUEST, ['field' => 'x']);

    expect($response->getStatusCode())->toBe(Response::HTTP_BAD_REQUEST);
    expect($response->getData(true))->toMatchArray([
        'success' => false,
        'message' => 'bad',
        'data' => null,
        'errors' => ['field' => 'x'],
        'meta' => null,
    ]);
});

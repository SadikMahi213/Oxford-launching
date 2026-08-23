# Backend (Laravel 12 / PHP 8.4) development image
FROM php:8.4-fpm

# System dependencies
RUN apt-get update && apt-get install -y \
        git \
        unzip \
        libpq-dev \
        libzip-dev \
        libicu-dev \
        zip \
    && rm -rf /var/lib/apt/lists/*

# PHP extensions required by Laravel + PostgreSQL + Redis
RUN docker-php-ext-configure pgsql -with-pgsql=/usr/local/pgsql || true \
    && docker-php-ext-install pdo_pgsql pgsql bcmath intl zip opcache

# PECL extensions (Redis)
RUN pecl install redis && docker-php-ext-enable redis

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install composer dependencies first (better layer caching)
COPY composer.json composer.lock* ./
RUN composer install --no-interaction --prefer-dist --no-scripts --no-autoloader \
    && composer dump-autoload --no-interaction

# Copy application source
COPY . .

# Laravel setup
RUN chown -R www-data:www-data storage bootstrap/cache \
    && php artisan config:clear

EXPOSE 9000

CMD ["php-fpm"]

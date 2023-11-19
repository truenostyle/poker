-- Создаем базу данных, если ее нет
CREATE DATABASE IF NOT EXISTS poker_db;

-- Используем созданную базу данных
USE poker_db;

-- Создаем таблицу для хранения информации о пользователях
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(255) NOT NULL,
    chips INT NOT NULL
);
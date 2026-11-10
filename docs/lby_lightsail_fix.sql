CREATE TABLE IF NOT EXISTS `lby_lightsail_fix` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `lby_id` bigint unsigned NOT NULL,
  `out_time` datetime DEFAULT NULL,
  `is_deleted` tinyint NOT NULL DEFAULT 0,
  `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_lby_lightsail_fix_lby_id` (`lby_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

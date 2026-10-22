-- Read-only evidence for the needs-based consultation question set (v3).
-- Run against homespace_core. SELECT only; no seed/reset/migration or user PII.
-- Actual AI recommendations are dynamic: these queries do NOT define a "best room".
-- Stage labels refer to the Linh journey, not the obsolete field-question suite.

-- 1. Seed baseline. Expected: 100 per category; 300 total.
SELECT l.category,count(*) AS public_listing_count
FROM listings l JOIN listing_addresses a ON a.listing_id=l.id AND a.active IS TRUE
WHERE l.active IS TRUE AND l.status='PUBLISHED' AND a.city_id='12'
GROUP BY GROUPING SETS ((l.category),())
ORDER BY l.category NULLS LAST;

-- 2. Relevant room supply: Hanh Thong18, An Nhon39, Govap43.
SELECT a.city_id,a.ward_id,a.ward,count(*) AS rooms,
       min(l.price_amount) AS min_rent,max(l.price_amount) AS max_rent
FROM listings l JOIN listing_addresses a ON a.listing_id=l.id AND a.active IS TRUE
WHERE l.active IS TRUE AND l.status='PUBLISHED' AND l.category='ROOM' AND a.city_id='12'
GROUP BY a.city_id,a.ward_id,a.ward ORDER BY a.ward_id;

-- 3. Linh's cost/eligibility stages. One shared monthly room charge is counted
--    once, per-person/per-bike charges use the stage quantities.
--    STRICTLY AN ESTIMATE using declared charges, not a quote/invoice.
--    Shared meter allocation, real current availability, exact late-night entry,
--    cat conditions and property condition still need confirmation.
--    FLEXIBLE is a candidate signal, not proof of a particular gate procedure.
--    Unknown/missing expected fee rows cannot silently become zero.
WITH stages(stage,people,bikes,kwh,m3,total_budget,min_area,require_cat,ward_ids) AS (VALUES
    ('S1_initial',1,1,100::numeric,4::numeric,4500000::numeric,0::numeric,false,ARRAY['24588','24332']),
    ('S2_S3_with_cat',1,1,100,4,4500000,0,true,ARRAY['24588','24332']),
    ('S4_two_people',2,2,180,6,4500000,20,true,ARRAY['24588','24332']),
    ('S5_expanded',2,2,180,6,4500000,20,true,ARRAY['24588','24332','24076']),
    ('S6_solo_again',1,1,100,4,4500000,20,true,ARRAY['24588','24332','24076'])
), room_evidence AS (
    SELECT l.id,l.title,l.price_amount,l.area_m2,l.available_from,
           a.ward_id,a.ward,a.street,a.display,
           r.max_occupants,r.max_vehicles,r.parking_policy,r.restroom_type,r.kitchen_type,
           r.access_hours_type,r.has_window,r.furnishing_status,r.electric_meter_type,r.water_meter_type,
           pet.policy_value AS pet_policy,pet.note AS pet_note
    FROM listings l
    JOIN listing_addresses a ON a.listing_id=l.id AND a.active IS TRUE
    JOIN listing_room_details r ON r.listing_id=l.id
    LEFT JOIN listing_policy_values pet ON pet.listing_id=l.id AND pet.policy_code='petPolicy'
    WHERE l.active IS TRUE AND l.status='PUBLISHED' AND l.category='ROOM' AND a.city_id='12'
), estimates AS (
    SELECT s.stage,s.people,s.bikes,s.kwh,s.m3,s.total_budget,r.*,
           fees.estimated_extras,
           coalesce(fees.known_methods,false)
             AND fees.electricity_rows=1 AND fees.water_rows=1
             AND fees.internet_rows=1 AND fees.management_rows=1
             AND fees.garbage_rows=1 AND fees.motorbike_rows=1 AS fee_rows_complete
    FROM stages s JOIN room_evidence r
      ON r.ward_id=ANY(s.ward_ids)
     AND r.max_occupants>=s.people AND r.max_vehicles>=s.bikes
     AND r.parking_policy IN ('FREE','PAID')
     AND r.restroom_type='PRIVATE' AND r.kitchen_type IN ('PRIVATE','SHARED')
     AND r.access_hours_type='FLEXIBLE' AND r.area_m2>=s.min_area
     AND (NOT s.require_cat OR r.pet_policy='ALLOWED')
    CROSS JOIN LATERAL (
        SELECT sum(CASE
            WHEN c.included_in_rent IS TRUE THEN 0
            WHEN c.billing_method='PER_KWH' THEN c.amount*s.kwh
            WHEN c.billing_method='PER_M3' THEN c.amount*s.m3
            WHEN c.billing_method='PER_MONTH' THEN c.amount
            WHEN c.billing_method='PER_PERSON_MONTH' THEN c.amount*s.people
            WHEN c.billing_method='PER_VEHICLE_MONTH' AND c.charge_type='MOTORBIKE_PARKING' THEN c.amount*s.bikes
            ELSE NULL END) AS estimated_extras,
            bool_and(c.amount IS NOT NULL AND c.included_in_rent IS NOT NULL AND (
                c.included_in_rent IS TRUE OR c.billing_method IN ('PER_KWH','PER_M3','PER_MONTH','PER_PERSON_MONTH')
                OR (c.billing_method='PER_VEHICLE_MONTH' AND c.charge_type='MOTORBIKE_PARKING'))) AS known_methods,
            count(*) FILTER (WHERE c.charge_type='ELECTRICITY') AS electricity_rows,
            count(*) FILTER (WHERE c.charge_type='WATER') AS water_rows,
            count(*) FILTER (WHERE c.charge_type='INTERNET') AS internet_rows,
            count(*) FILTER (WHERE c.charge_type='MANAGEMENT') AS management_rows,
            count(*) FILTER (WHERE c.charge_type='SERVICE_OR_GARBAGE') AS garbage_rows,
            count(*) FILTER (WHERE c.charge_type='MOTORBIKE_PARKING') AS motorbike_rows
        FROM listing_charges c WHERE c.listing_id=r.id AND c.active IS TRUE
    ) fees
), budget_candidates AS (
    SELECT *,price_amount+estimated_extras AS estimated_monthly_total
    FROM estimates
    WHERE fee_rows_complete AND price_amount+estimated_extras<=total_budget
), ranked_for_inspection AS (
    SELECT *,row_number() OVER (PARTITION BY stage ORDER BY estimated_monthly_total,id) AS row_no
    FROM budget_candidates
)
SELECT s.stage,s.people,s.bikes,s.kwh,s.m3,s.total_budget,
       count(c.id) AS candidates_with_declared_conditions_and_estimated_budget,
       coalesce(jsonb_agg(jsonb_build_object(
           'id',c.id,'title',c.title,'ward',c.ward,'rent',c.price_amount,
           'estimated_extras',c.estimated_extras,'estimated_total',c.estimated_monthly_total,
           'area_m2',c.area_m2,'occupants',c.max_occupants,'vehicles',c.max_vehicles,
           'parking',c.parking_policy,'wc',c.restroom_type,'kitchen',c.kitchen_type,
           'access_hours',c.access_hours_type,'window',c.has_window,
           'cat_policy',c.pet_policy,'cat_note',c.pet_note,
           'electric_meter',c.electric_meter_type,'water_meter',c.water_meter_type,
           'available_from',c.available_from)
           ORDER BY c.estimated_monthly_total,c.id) FILTER (WHERE c.row_no<=10),'[]'::jsonb) AS sample_for_grader_not_ai
FROM stages s LEFT JOIN ranked_for_inspection c ON c.stage=s.stage
GROUP BY s.stage,s.people,s.bikes,s.kwh,s.m3,s.total_budget
ORDER BY s.stage;

-- 4. Lease conditions matter for short-stay/initial-cash needs.
--    All seed rooms: MONTH_COUNT1, minimum3months, MONTHLY.
SELECT l.deposit_type,l.deposit_months,l.deposit_amount,l.minimum_lease_months,l.payment_cycle,count(*) AS rooms
FROM listings l JOIN listing_addresses a ON a.listing_id=l.id AND a.active IS TRUE
WHERE l.active IS TRUE AND l.status='PUBLISHED' AND l.category='ROOM' AND a.city_id='12'
GROUP BY l.deposit_type,l.deposit_months,l.deposit_amount,l.minimum_lease_months,l.payment_cycle;

-- 5. Unknown location details remain unknown; coordinates are only demo road points.
SELECT count(*) AS rooms,
       count(*) FILTER (WHERE a.house_number IS NULL) AS no_verified_house_number,
       count(*) FILTER (WHERE a.ref_id IS NULL) AS no_provider_ref,
       count(*) FILTER (WHERE a.resolved_at IS NULL) AS not_provider_resolved,
       count(*) FILTER (WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL) AS with_demo_coordinates
FROM listings l JOIN listing_addresses a ON a.listing_id=l.id AND a.active IS TRUE
WHERE l.active IS TRUE AND l.status='PUBLISHED' AND l.category='ROOM' AND a.city_id='12';

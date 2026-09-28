import urllib.request
import json

def call_api(endpoint, method='GET', data=None):
    url = f'http://127.0.0.1:8000{endpoint}'
    req = urllib.request.Request(url, method=method)
    if data:
        req.add_header('Content-Type', 'application/json')
        body = json.dumps(data).encode('utf-8')
    else:
        body = None
    with urllib.request.urlopen(req, data=body) as res:
        return json.loads(res.read().decode('utf-8'))

print('=== 1. NOMINAL STATE / RUN OPTIMIZATION ===')
call_api('/api/emergency/CLEAR', 'POST')
call_api('/api/scenario/NORMAL', 'POST')
res = call_api('/api/reoptimize', 'POST')
opt = res.get('final_schedule', {})
telem = res.get('telemetry', {})
print('Status:', res.get('system_status'))
print('Solver:', opt.get('solver_type'))
print(f"Demand: {telem.get('base_demand_mw')} MW")
print(f"G1: {opt.get('g1_mw')} MW, G2: {opt.get('g2_mw')} MW, G3: {opt.get('g3_mw')} MW")
print(f"Solar: {opt.get('solar_mw')} MW, Wind: {opt.get('wind_mw')} MW")
print(f"Battery Chg: {opt.get('battery_charge_mw')} MW, Dischg: {opt.get('battery_discharge_mw')} MW")
print(f"Grid Imp: {opt.get('grid_import_mw')} MW, Exp: {opt.get('grid_export_mw')} MW")
print(f"Feasible: {opt.get('is_feasible')}, Violations: {opt.get('violations')}")
print(f"Reserve Margin: {opt.get('reserve_margin_mw')} MW")
print(f"Cost: ${opt.get('total_cost_usd')}, CO2: {opt.get('co2_emissions_tons')} tons")

print('\n=== 2. BATTERY UNAVAILABLE ===')
res_bat = call_api('/api/emergency/BATTERY_FAILURE', 'POST')
opt_bat = res_bat.get('final_schedule', {})
print(f"Bat Dischg: {opt_bat.get('battery_discharge_mw')} MW, Chg: {opt_bat.get('battery_charge_mw')} MW")
print(f"G1: {opt_bat.get('g1_mw')} MW, Grid Imp: {opt_bat.get('grid_import_mw')} MW")
print(f"Feasible: {opt_bat.get('is_feasible')}, Violations: {opt_bat.get('violations')}")
print(f"Reserve Margin: {opt_bat.get('reserve_margin_mw')} MW")

print('\n=== 3. GENERATOR UNAVAILABLE (G1_FAILURE) ===')
res_g1 = call_api('/api/emergency/G1_FAILURE', 'POST')
opt_g1 = res_g1.get('final_schedule', {})
print(f"G1: {opt_g1.get('g1_mw')} MW, G2: {opt_g1.get('g2_mw')} MW, G3: {opt_g1.get('g3_mw')} MW")
print(f"Grid Imp: {opt_g1.get('grid_import_mw')} MW, Feasible: {opt_g1.get('is_feasible')}, Violations: {opt_g1.get('violations')}")
print(f"Reserve Margin: {opt_g1.get('reserve_margin_mw')} MW")

print('\n=== 4. LOW RENEWABLE SCENARIO ===')
call_api('/api/emergency/CLEAR', 'POST')
res_low = call_api('/api/scenario/LOW', 'POST')
opt_low = res_low.get('final_schedule', {})
print(f"Solar: {opt_low.get('solar_mw')} MW, Wind: {opt_low.get('wind_mw')} MW")
print(f"Generators: G1={opt_low.get('g1_mw')} MW, G2={opt_low.get('g2_mw')} MW, G3={opt_low.get('g3_mw')} MW")
print(f"Battery Dischg: {opt_low.get('battery_discharge_mw')} MW, Grid Imp: {opt_low.get('grid_import_mw')} MW")
print(f"Feasible: {opt_low.get('is_feasible')}, Violations: {opt_low.get('violations')}")
print(f"Cost: ${opt_low.get('total_cost_usd')}, CO2: {opt_low.get('co2_emissions_tons')} tons")

print('\n=== 5. DEMAND SPIKE ===')
res_spk = call_api('/api/emergency/DEMAND_SPIKE', 'POST')
opt_spk = res_spk.get('final_schedule', {})
print(f"Generators: G1={opt_spk.get('g1_mw')} MW, G2={opt_spk.get('g2_mw')} MW, G3={opt_spk.get('g3_mw')} MW")
print(f"Grid Imp: {opt_spk.get('grid_import_mw')} MW, Battery Dischg: {opt_spk.get('battery_discharge_mw')} MW")
print(f"Feasible: {opt_spk.get('is_feasible')}, Violations: {opt_spk.get('violations')}")
print(f"Reserve Margin: {opt_spk.get('reserve_margin_mw')} MW")

# Restore nominal
call_api('/api/emergency/CLEAR', 'POST')
call_api('/api/scenario/NORMAL', 'POST')
call_api('/api/reoptimize', 'POST')
print('\n=== ALL 5 SCENARIOS EXECUTED & RESTORED ===')

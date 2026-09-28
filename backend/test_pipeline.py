from app.services.grid_controller import GridController

ctrl = GridController()
# Test baseline
res = ctrl.execute_pipeline()
print('Baseline Feasible:', res.final_schedule.is_feasible, 'Violations:', res.final_schedule.violations)

# Test battery unavailable
ctrl.battery.is_available = False
ctrl.battery.forced_offline = True
ctrl.overrides.battery_available = False
res_nobatt = ctrl.execute_pipeline()
print('No Battery Feasible:', res_nobatt.final_schedule.is_feasible, 'Violations:', res_nobatt.final_schedule.violations)
print(f'G1: {res_nobatt.final_schedule.g1_mw} (Committed: {res_nobatt.final_schedule.g1_committed})')
print(f'G2: {res_nobatt.final_schedule.g2_mw} (Committed: {res_nobatt.final_schedule.g2_committed})')
print(f'G3: {res_nobatt.final_schedule.g3_mw} (Committed: {res_nobatt.final_schedule.g3_committed})')
print(f'Bat Dis: {res_nobatt.final_schedule.battery_discharge_mw}, Bat Chg: {res_nobatt.final_schedule.battery_charge_mw}')
print(f'Grid Imp: {res_nobatt.final_schedule.grid_import_mw}, Grid Exp: {res_nobatt.final_schedule.grid_export_mw}')
print(f'Reserve Margin: {res_nobatt.final_schedule.reserve_margin_mw} MW')
print(f'Explanation key drivers: {res_nobatt.explanation.key_drivers}')
print(f'Battery decision rationale: {res_nobatt.explanation.battery_decision_rationale}')

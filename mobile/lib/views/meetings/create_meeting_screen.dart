import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../controllers/meeting_controller.dart';
import '../../utils/app_notification.dart';
import '../../utils/theme.dart';

class CreateMeetingScreen extends StatefulWidget {
  const CreateMeetingScreen({Key? key}) : super(key: key);

  @override
  State<CreateMeetingScreen> createState() => _CreateMeetingScreenState();
}

class _CreateMeetingScreenState extends State<CreateMeetingScreen> {
  final MeetingController controller = Get.find<MeetingController>();
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _locationController = TextEditingController();
  String _meetingType = 'physical';
  String _category = 'General';
  DateTime? _selectedDate;
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(primary: AppTheme.primaryColor),
          ),
          child: child!,
        );
      },
    );
    if (date != null) {
      final start = await showTimePicker(
        context: context,
        initialTime: _startTime ?? const TimeOfDay(hour: 9, minute: 0),
        helpText: 'START TIME',
        builder: (context, child) {
          return Theme(
            data: Theme.of(context).copyWith(
              colorScheme: const ColorScheme.dark(primary: AppTheme.primaryColor),
            ),
            child: child!,
          );
        },
      );
      if (start != null) {
        final end = await showTimePicker(
          context: context,
          initialTime: _endTime ?? TimeOfDay(hour: start.hour + 1, minute: start.minute),
          helpText: 'END TIME',
          builder: (context, child) {
            return Theme(
              data: Theme.of(context).copyWith(
                colorScheme: const ColorScheme.dark(primary: AppTheme.primaryColor),
              ),
              child: child!,
            );
          },
        );
        setState(() {
          _selectedDate = date;
          _startTime = start;
          if (end != null) _endTime = end;
        });
      }
    }
  }

  Future<void> _handleCreate() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDate == null) {
      Get.snackbar('Error', 'Please select a date');
      return;
    }

    final dateStr = _selectedDate!.toIso8601String().substring(0, 10);
    final startTimeStr = _startTime != null
        ? '${_startTime!.hour.toString().padLeft(2, '0')}:${_startTime!.minute.toString().padLeft(2, '0')}'
        : '09:00';
    final endTimeStr = _endTime != null
        ? '${_endTime!.hour.toString().padLeft(2, '0')}:${_endTime!.minute.toString().padLeft(2, '0')}'
        : '12:00';

    final meetingData = {
      'title': _titleController.text.trim(),
      'description': _descController.text.trim(),
      'date': '${dateStr}T12:00',
      'startTime': startTimeStr,
      'endTime': endTimeStr,
      'location': _meetingType == 'zoom' ? 'Zoom' : _locationController.text.trim(),
      'category': _category,
      'meetingType': _meetingType,
    };

    final success = await controller.createMeeting(meetingData);
    if (success) {
      Get.back();
      // Show after leaving create screen so Get.back() does not dismiss the dialog
      Future.microtask(() {
        AppNotification.success(
          'Meeting Successful',
          'Meeting scheduled successfully',
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Schedule Meeting')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildLabel('Meeting Title'),
              _buildTextField(_titleController, 'Enter meeting title',
                  validator: (v) => v == null || v.isEmpty ? 'Title is required' : null),
              const SizedBox(height: 20),

              _buildLabel('Description'),
              _buildTextField(_descController, 'What is this meeting about?',
                  maxLines: 3,
                  validator: (v) => v == null || v.isEmpty ? 'Description is required' : null),
              const SizedBox(height: 20),

              Row(
                children: [
                  Expanded(child: _buildTypeDropdown()),
                  const SizedBox(width: 12),
                  Expanded(child: _buildCategoryDropdown()),
                ],
              ),
              const SizedBox(height: 20),

              _buildLabel('Date & Time'),
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  width: double.infinity,
                  padding: EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceColor,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.borderColor),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today, color: AppTheme.primaryColor, size: 20),
                      const SizedBox(width: 12),
                      Text(
                        _selectedDate != null
                            ? '${_selectedDate!.day}/${_selectedDate!.month}/${_selectedDate!.year}${_startTime != null ? ' ${_startTime!.format(context)}' : ''}${_endTime != null ? ' — ${_endTime!.format(context)}' : ''}'
                            : 'Select date and time range',
                        style: TextStyle(
                          color: _selectedDate != null ? AppTheme.textPrimary : AppTheme.textSubtle,
                          fontSize: AppTheme.fontBody,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              if (_meetingType != 'zoom') ...[
                _buildLabel('Location'),
                _buildTextField(_locationController, 'e.g. Banadir Community Hall',
                    validator: (v) {
                      if (_meetingType != 'zoom' && (v == null || v.isEmpty)) return 'Location is required';
                      return null;
                    }),
                const SizedBox(height: 20),
              ],

              const SizedBox(height: 10),
              Obx(() => SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: controller.isLoading.value ? null : _handleCreate,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 4,
                  ),
                  child: controller.isLoading.value
                      ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                      : const Text('Create Meeting', style: TextStyle(fontSize: AppTheme.fontCardTitle, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              )),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: EdgeInsets.only(bottom: 8),
      child: Text(text, style: TextStyle(color: AppTheme.textMuted, fontSize: AppTheme.fontBody, fontWeight: FontWeight.w600)),
    );
  }

  Widget _buildTextField(TextEditingController controller, String hint,
      {int maxLines = 1, String? Function(String?)? validator}) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      validator: validator,
      style: TextStyle(color: AppTheme.textPrimary),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: AppTheme.textSubtle),
        filled: true,
        fillColor: AppTheme.surfaceColor,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: AppTheme.borderColor)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: AppTheme.borderColor)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppTheme.primaryColor, width: 2)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }

  Widget _buildTypeDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel('Meeting Type'),
        Container(
          padding: EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: AppTheme.surfaceColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.borderColor),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _meetingType,
              isExpanded: true,
              dropdownColor: AppTheme.surfaceColor,
              style: TextStyle(color: AppTheme.textPrimary),
              items: const [
                DropdownMenuItem(value: 'physical', child: Text('Physical')),
                DropdownMenuItem(value: 'zoom', child: Text('Zoom')),
              ],
              onChanged: (v) => setState(() => _meetingType = v ?? 'physical'),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel('Category'),
        Container(
          padding: EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: AppTheme.surfaceColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.borderColor),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _category,
              isExpanded: true,
              dropdownColor: AppTheme.surfaceColor,
              style: TextStyle(color: AppTheme.textPrimary),
              items: const [
                DropdownMenuItem(value: 'General', child: Text('General')),
                DropdownMenuItem(value: 'Banadir', child: Text('Banadir')),
                DropdownMenuItem(value: 'Hargeisa', child: Text('Hargeisa')),
                DropdownMenuItem(value: 'Garowe', child: Text('Garowe')),
                DropdownMenuItem(value: 'Kismayo', child: Text('Kismayo')),
                DropdownMenuItem(value: 'Baidoa', child: Text('Baidoa')),
              ],
              onChanged: (v) => setState(() => _category = v ?? 'General'),
            ),
          ),
        ),
      ],
    );
  }
}